// Run against the local app. Fixtures isolate the test from database writes.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:\\Users\\zakiu\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const read = name => JSON.parse(fs.readFileSync(path.resolve('src/data', name), 'utf8'));
const data = { summary: read('ntt-summary.json'), boundary: read('ntt-boundary.json'), districts: read('ntt-districts.json'), facilities: read('ntt-facilities.json'), episodes: read('ntt-episodes.json'), geoai: read('ntt-geoai-manifest.json') };
const episode = data.episodes.find(e => e.id === '857821124P001129');
const other = data.episodes.find(e => e.cat === 'RENDAH_SIM');
const base = process.env.SIGARA_TEST_URL || 'http://127.0.0.1:3128';
const out = path.resolve('test-results/officer-review');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 950 } });
    const page = await context.newPage(); page.setDefaultTimeout(60000);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/showcase?*', route => route.fulfill({ json: { data: { ...data, episodes: [episode, other] }, source: 'neon' } }));
    // Use the existing evidence asset; this test does not generate or modify evidence.
    let evidence;
    await page.route('**/api/geoai/evidence/**', async route => {
      if (!evidence) {
        const url = new URL(route.request().url());
        const response = await fetch('https://sigara-ntt.vercel.app' + url.pathname + url.search);
        assert.equal(response.status, 200); evidence = Buffer.from(await response.arrayBuffer());
      }
      await route.fulfill({ contentType: 'image/png', body: evidence });
    });
    await page.goto(base + '/episode/' + episode.id);
    await page.getByRole('link', { name: 'Keputusan petugas & laporan akhir' }).click();
    const panel = page.locator('#keputusan-petugas');
    await panel.getByLabel('Nama petugas', { exact: true }).fill('Rina Utami');
    await panel.getByLabel('Jabatan / unit', { exact: true }).fill('Verifikator Kupang');
    await panel.getByRole('button', { name: 'Simpan draf', exact: true }).click();
    await page.reload();
    assert.equal(await panel.getByLabel('Nama petugas', { exact: true }).inputValue(), 'Rina Utami');
    await panel.getByRole('button', { name: 'Periksa & sahkan keputusan', exact: true }).click();
    assert.equal(await panel.getByRole('button', { name: 'Sahkan & buka laporan', exact: true }).count(), 0);

    const choices = ['Tidak terindikasi fraud', 'Perlu klarifikasi', 'Dugaan fraud — lanjut audit', 'Fraud terkonfirmasi'];
    for (let index = 0; index < choices.length; index++) {
      if (index) await panel.getByRole('button', { name: 'Buat revisi keputusan' }).click();
      await panel.getByRole('radio', { name: new RegExp('^' + choices[index]) }).check();
      await panel.getByLabel('Kebutuhan klinis pasien', { exact: true }).check();
      await panel.getByLabel(index === 3 ? 'Referensi hasil pemeriksaan / dokumen penetapan' : 'Bukti yang ditelaah', { exact: true }).fill('Berkas pemeriksaan 031/2026; hasil klarifikasi fasilitas tujuan.');
      await panel.getByLabel('Alasan keputusan', { exact: true }).fill('Hasil telaah ke-' + (index + 1) + ': dokumen perjalanan dan layanan fasilitas telah diperiksa oleh petugas.');
      await panel.getByLabel('Saya telah menelaah bukti', { exact: false }).check();
      if (index === 0) {
        await panel.screenshot({ path: path.join(out, 'decision-desktop.png') });
        await page.setViewportSize({ width: 390, height: 844 });
        await panel.screenshot({ path: path.join(out, 'decision-mobile.png') });
        assert.equal(await panel.evaluate(el => el.scrollWidth <= el.clientWidth), true, 'Panel must fit mobile width');
      }
      await panel.getByRole('button', { name: 'Periksa & sahkan keputusan', exact: true }).click();
      await panel.getByRole('region', { name: 'Ringkasan sebelum pengesahan' }).waitFor();
      await panel.getByRole('button', { name: 'Sahkan & buka laporan', exact: true }).click();
      await page.locator('.report-modal-overlay').waitFor();
      const doc = page.locator('#printable-report');
      assert.ok((await doc.textContent()).includes(choices[index]));
      assert.ok((await doc.locator('.doc-officer-review').textContent()).includes('Rina Utami'));
      assert.ok((await doc.locator('.doc-sign-box').last().textContent()).includes('Rina Utami'));
      assert.ok((await doc.textContent()).includes(episode.toName));
      if (index === 3) {
        await page.evaluate(() => { window.print = () => { window.__printRequested = true; }; });
        await page.getByRole('button', { name: 'Cetak / Simpan PDF' }).click();
        await page.waitForFunction(() => window.__printRequested);
        await page.pdf({ path: path.join(out, 'approved-report.pdf'), format: 'A4', preferCSSPageSize: true, printBackground: true });
      }
      await page.getByRole('button', { name: 'Tutup jendela laporan' }).click();
      await page.reload();
      await panel.getByRole('heading', { name: choices[index], exact: true }).waitFor();
      console.log(choices[index] + ': decision, report, reload and revision passed');
    }
    await page.getByRole('button', { name: 'Buka Laporan Episode', exact: true }).click();
    assert.ok((await page.locator('#printable-report').textContent()).includes('Fraud terkonfirmasi'));
    await page.getByRole('button', { name: 'Tutup jendela laporan' }).click();
    await panel.getByText('Riwayat keputusan petugas', { exact: true }).click();
    await panel.getByRole('button', { name: /^Revisi 1 ·/ }).click();
    assert.ok((await page.locator('.doc-officer-review').textContent()).includes('Tidak terindikasi fraud'));
    await page.getByRole('button', { name: 'Tutup jendela laporan' }).click();
    await page.goto(base + '/episode/' + other.id);
    await panel.getByLabel('Nama petugas', { exact: true }).waitFor();
    assert.equal(await panel.getByLabel('Nama petugas', { exact: true }).inputValue(), '');
    assert.equal(await panel.getByRole('radio', { checked: true }).count(), 0);
    await page.goto(base + '/');
    await page.getByRole('button', { name: 'Buka daftar episode ditelaah, total 1', exact: true }).click();
    assert.ok((await page.locator('.agent-drawer-body').textContent()).includes('Rina Utami'));
    await page.getByRole('button', { name: 'Buka laporan hasil', exact: true }).click();
    assert.ok((await page.locator('.doc-officer-review').textContent()).includes('Fraud terkonfirmasi'));
    assert.deepEqual(errors, []);
    execFileSync(process.env.SIGARA_PYTHON || 'python', ['-c', `
from pypdf import PdfReader
import sys
pages = [page.extract_text() for page in PdfReader(sys.argv[1]).pages]
text = '\\n'.join(pages)
for label in ['Fraud terkonfirmasi', 'Rina Utami', 'Verifikator Kupang', 'Berkas pemeriksaan 031/2026', 'Hasil telaah ke-4', 'Tindak lanjut', 'Dokumen ini dihasilkan']:
    assert label in text, label
assert all(len(p.strip()) > 40 for p in pages), 'blank page'
assert any(all(s in p for s in ['SIGARA AGENT VERIFIED', 'Petugas Penelaah Lapangan:', 'Rina Utami']) for p in pages), 'split signatures'
print(f'Approved report: {len(pages)} complete pages with decision, evidence, officer and signatures')
`, path.join(out, 'approved-report.pdf')], { stdio: 'inherit' });
    console.log('Draft persistence, required fields, mobile layout, episode isolation and immutable history passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
