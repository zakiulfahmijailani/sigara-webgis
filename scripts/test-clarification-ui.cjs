const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:\\Users\\zakiu\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.SIGARA_TEST_URL || 'http://127.0.0.1:3107';
const out = path.resolve('test-results/clarification-demo');
fs.mkdirSync(out, { recursive: true });
(async () => {
 const browser = await chromium.launch({ channel: 'chrome', headless: true });
 try {
 const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
 const page = await ctx.newPage();
 page.setDefaultTimeout(60000);
 const errors = [], external = [];
 page.on('pageerror', e => errors.push(e.message));
 page.on('request', r => { if (/sendgrid|mailgun|openai.com|anthropic|gmail|whatsapp/i.test(r.url())) external.push(r.url()); });
 await page.goto(base);
 await page.locator('.agent-activity-bar').waitFor();
 assert.deepEqual(await page.locator('.card-stat').allTextContents(), ['0', '0', '0', '0']);
 await page.screenshot({ path: path.join(out, '01-dashboard-empty.png') });
 const ids = ['290411124Y000018', '177250424P000119', '496481024Y000339'];
 const getCase = id => page.evaluate(id => JSON.parse(localStorage.getItem('sigara-clarification-cases-v1'))[id], id);
 async function status(id, expected) { assert.equal((await getCase(id)).status, expected); }
 async function close(id) {
  await page.getByRole('button', { name: 'Tinjau & Tutup Kasus' }).click();
  await page.locator('#closure-notes-textarea').fill('Ditinjau oleh petugas untuk arsip demonstrasi, seluruh jawaban dummy.');
  await page.getByRole('button', { name: 'Konfirmasi Penutupan Kasus' }).click();
  await status(id, 'closed');
 }
 for (let i = 0; i < 3; i++) {
  const id = ids[i];
  await page.goto(base + '/episode/' + id);
  const panel = page.locator('#klarifikasi');
  await panel.waitFor();
  await panel.locator('.fixture-choice-btn').nth(i).click();
  await page.getByRole('button', { name: /Buat Laporan & Mulai/ }).click();
  await status(id, 'draft');
  await page.getByRole('button', { name: /Simulasikan Pengiriman Permintaan/ }).click();
  await status(id, 'awaiting_response');
  if (i === 2) {
   for (let n = 0; n < 3; n++) await page.getByRole('button', { name: 'Majukan ke Tenggat Berikutnya' }).click();
   await status(id, 'escalated');
   assert.equal((await getCase(id)).reminderCount, 2);
   await panel.screenshot({ path: path.join(out, '04-reminders-escalation.png') });
   await page.getByRole('button', { name: 'Simulasikan Balasan Terlambat' }).click();
  } else {
   await page.getByRole('button', { name: 'Simulasikan Balasan Faskes' }).click();
   if (i === 1) {
    await status(id, 'response_received');
    await page.getByRole('button', { name: /Jawab Pertanyaan Faskes/ }).click();
    await page.getByRole('button', { name: 'Simulasikan Balasan Faskes' }).click();
    await status(id, 'followup_required');
    await panel.screenshot({ path: path.join(out, '03-followup-required.png') });
    await page.getByRole('button', { name: /Kirim Pertanyaan Lanjutan/ }).click();
    await page.getByRole('button', { name: 'Simulasikan Balasan Faskes' }).click();
   }
  }
  await status(id, 'ready_for_review');
  await panel.screenshot({ path: path.join(out, 'thread-' + i + '.png') });
  await close(id);
  await panel.screenshot({ path: path.join(out, 'closed-' + i + '.png') });
  const saved = await getCase(id);
  await page.reload(); await page.locator('#klarifikasi .case-closed-banner').waitFor();
  assert.deepEqual(await getCase(id), saved);
  await page.getByRole('button', { name: 'Buka Laporan Klarifikasi Terbaru' }).click();
  await page.locator('.doc-clarification').waitFor();
  assert.ok((await page.locator('.doc-clarification').innerText()).includes('closed'));
  await page.locator('.report-modal-container').screenshot({ path: path.join(out, 'report-' + i + '.png') });
  // Print stylesheet keeps the document visible; actual saving remains the browser dialog.
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('#printable-report').evaluate(e => getComputedStyle(e).visibility), 'visible');
  await page.emulateMedia({ media: 'screen' });
  await page.getByRole('button', { name: 'Tutup jendela laporan' }).click();
  await page.goto(base); await page.locator('.agent-activity-bar').waitFor();
 }
 await page.waitForFunction(() => [...document.querySelectorAll('.card-stat')].map(e => e.textContent).join(',') === '0,0,3,7');
 assert.deepEqual(await page.locator('.card-stat').allTextContents(), ['0', '0', '3', '7']);
 await page.getByRole('button', { name: /Balasan diterima: 3/ }).click();
 assert.equal(await page.locator('.agent-drawer-body .outbox-card').count(), 3);
 await page.getByRole('button', { name: 'Tutup', exact: true }).click();
 await page.waitForFunction(() => !document.body.innerText.includes('Memuat data NTT…') && !document.body.innerText.includes('Menyiapkan daftar episode…'));
 await page.screenshot({ path: path.join(out, '05-dashboard-completed.png') });
 await page.setViewportSize({ width: 390, height: 844 });
 await page.goto(base + '/episode/' + ids[1]); await page.locator('#klarifikasi').waitFor();
 await page.locator('#klarifikasi').screenshot({ path: path.join(out, '06-mobile-thread.png') });
 assert.ok(await page.locator('#klarifikasi').evaluate(e => e.scrollWidth <= e.clientWidth + 1), 'Panel must fit mobile');
 const observer = await ctx.newPage();
 await observer.goto(base);
 await observer.waitForFunction(() => [...document.querySelectorAll('.card-stat')].map(e => e.textContent).join(',') === '0,0,3,7');
 page.once('dialog', d => d.accept());
 await page.getByRole('button', { name: 'Reset Kasus', exact: true }).click();
 await observer.waitForFunction(() => [...document.querySelectorAll('.card-stat')].map(e => e.textContent).join(',') === '0,0,3,4');
 assert.equal(await getCase(ids[1]), undefined);
 assert.equal((await getCase(ids[0])).status, 'closed');
 await observer.close();
 assert.deepEqual(external, []);
 assert.deepEqual(errors, []);
 console.log('PASS: all three flows, linked report snapshots, refresh, dashboard totals, print, mobile; no messaging provider requests.');
 } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
