// Run against a built application: SIGARA_TEST_URL=http://localhost:3107
// Install Playwright separately, or set PLAYWRIGHT_MODULE to its absolute package path.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.SIGARA_TEST_URL || 'http://127.0.0.1:3107';
const out = path.resolve('test-results/map-first');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(20000); page.setDefaultNavigationTimeout(30000);
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  const ready = async () => {
    await page.getByRole('heading', { name: 'Peta rujukan Nusa Tenggara Timur' }).waitFor();
    await page.locator('.overview-category.all strong').filter({ hasText: /\d/ }).waitFor();
    await page.locator('.overview-marker').first().waitFor();
  };
  const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Horizontal viewport overflow');
  try {
    await page.goto(base); await ready();
    assert.equal(await page.locator('.overview-category.all strong').innerText(), '3.683');
    assert.equal(await page.locator('.overview-category.red strong').innerText(), '364');
    assert.equal(await page.locator('.overview-category.orange strong').innerText(), '23');
    assert.equal(await page.locator('.overview-category.green strong').innerText(), '3.296');
    await page.waitForFunction(() => [...document.querySelectorAll('.overview-marker span')].reduce((sum, el) => sum + Number(el.textContent.replaceAll('.', '')), 0) === 3683);
    assert.equal(requests.some(url => /\/geoai\//.test(url) || url.includes('/visits?')), false, 'Home fetched detail-only evidence');
    await noOverflow(); await page.screenshot({ path: path.join(out, '01-home-desktop.png'), fullPage: true });

    await page.locator('.overview-category.orange').click();
    await page.waitForFunction(() => document.querySelector('.overview-result-bar strong')?.textContent === '23');
    await page.locator('.overview-category.green').click();
    await page.waitForFunction(() => document.querySelector('.overview-result-bar strong')?.textContent === '3.296');
    await page.locator('.overview-category.red').click();
    await page.waitForFunction(() => document.querySelector('.overview-result-bar strong')?.textContent === '364');
    await page.getByRole('combobox', { name: 'Kabupaten atau kota asal' }).selectOption('Sikka');
    await page.waitForURL(/district=Sikka/);
    await page.locator('.overview-marker:not(.is-cluster)').first().waitFor();
    await page.locator('.overview-marker:not(.is-cluster)').first().click();
    await page.waitForURL(url => url.pathname.startsWith('/episode/') || url.searchParams.has('origin'));
    if (new URL(page.url()).pathname === '/') {
      await page.getByRole('heading', { name: 'Episode dari titik ini' }).waitFor();
      await page.locator('.overview-case').first().click();
    }
    await page.getByRole('tab', { name: 'Ringkasan Kasus' }).waitFor();
    assert.equal(requests.filter(url => url.includes('/api/showcase') && !url.includes('/visits')).length, 1, 'Snapshot fetched again during client navigation');
    await page.getByRole('link', { name: 'Kembali ke peta NTT' }).click(); await ready();
    assert.equal(new URL(page.url()).searchParams.get('district'), 'Sikka');
    assert.equal(new URL(page.url()).searchParams.get('cat'), 'red');
    assert.ok(Number(new URL(page.url()).searchParams.get('z')) > 6, 'Map zoom not restored');
    await page.screenshot({ path: path.join(out, '02-return-to-filtered-map.png'), fullPage: true });

    await page.getByRole('button', { name: 'Reset filter', exact: true }).click();
    await page.getByRole('button', { name: 'Filter lainnya' }).click();
    await page.getByRole('checkbox', { name: /Hanya episode dengan ilustrasi GeoAI/ }).check();
    await page.waitForFunction(() => document.querySelector('.overview-result-bar strong')?.textContent === '8');
    await page.getByRole('button', { name: 'Filter lainnya' }).click();
    await page.getByRole('textbox', { name: 'Cari ID episode atau fasilitas' }).fill('290411124Y000018');
    await page.getByRole('button', { name: 'Cari', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.overview-result-bar strong')?.textContent === '1');
    await page.locator('.overview-case').click();
    await page.getByRole('tab', { name: 'Ringkasan Kasus' }).waitFor();
    await page.locator('.inv-map-frame .map-canvas canvas').waitFor();
    await page.getByText('Lapisan peta', { exact: true }).click();
    assert.equal(await page.getByRole('checkbox', { name: /Referensi faskes/ }).isChecked(), false, 'Focused map starts with reference facilities hidden');
    await page.getByText('Lapisan peta', { exact: true }).click();
    await noOverflow();
    await page.screenshot({ path: path.join(out, '03-episode-summary.png'), fullPage: true });
    await page.getByRole('tab', { name: /Bukti GeoAI/ }).click();
    await page.waitForURL(/tab=evidence/);
    await page.locator('.geoai-viewer-container img').first().waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('.geoai-viewer-container img')].every(image => image.complete && image.naturalWidth > 0));
    await page.screenshot({ path: path.join(out, '04-episode-evidence.png'), fullPage: true });
    await page.getByRole('tab', { name: /Kunjungan Terkait/ }).click();
    await page.locator('.visits-table tbody tr').first().waitFor();
    assert.ok(requests.some(url => url.includes('/visits?episodeId=290411124Y000018')));
    await page.getByRole('tab', { name: /Metode/ }).focus();
    await page.keyboard.press('Home');
    await page.waitForURL(/tab=summary/);
    assert.equal(await page.getByRole('tab', { name: 'Ringkasan Kasus' }).getAttribute('aria-selected'), 'true');
    await page.getByRole('link', { name: 'Kembali ke peta NTT' }).click(); await ready();
    await page.goBack(); await page.getByRole('tab', { name: 'Ringkasan Kasus' }).waitFor();
    await page.goForward(); await ready();

    await page.goto(`${base}/?q=no-such-episode`);
    await page.getByRole('heading', { name: 'Tidak ada episode yang sesuai' }).waitFor();
    await page.getByRole('button', { name: 'Hapus filter', exact: true }).click(); await ready();
    await page.getByRole('button', { name: 'Tutup daftar', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('.overview-workspace.with-list'));
    await page.getByRole('button', { name: 'Buka daftar episode', exact: true }).first().click();
    await page.locator('.overview-workspace.with-list').waitFor();

    for (const viewport of [{ width: 1366, height: 768 }, { width: 850, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport); await noOverflow();
      if (viewport.width === 390) { await page.goto(base); await ready(); }
      await page.screenshot({ path: path.join(out, `05-home-${viewport.width}.png`), fullPage: true });
    }
    await page.locator('.overview-case').first().click();
    await page.getByRole('tab', { name: 'Ringkasan Kasus' }).waitFor(); await noOverflow();
    await page.locator('.inv-map-frame .map-canvas canvas').waitFor();
    await page.screenshot({ path: path.join(out, '06-episode-mobile.png'), fullPage: true });

    // Network failure offers a retry; a failed promise must not poison the shared cache.
    const fail = await browser.newContext();
    const failPage = await fail.newPage();
    await failPage.route('**/api/showcase', route => route.abort());
    await failPage.goto(base); await failPage.getByRole('heading', { name: 'Data belum dapat dimuat' }).waitFor();
    await failPage.unroute('**/api/showcase'); await failPage.getByRole('button', { name: 'Coba lagi', exact: true }).click();
    await failPage.locator('.overview-marker').first().waitFor(); await fail.close();

    // No-WebGL fallback still exposes the map and usable case links.
    const fallback = await browser.newContext();
    await fallback.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) { return String(type).includes('webgl') ? null : original.call(this, type, ...args); };
    });
    const fallbackPage = await fallback.newPage(); await fallbackPage.goto(base);
    await fallbackPage.getByText('Peta sederhana · gunakan daftar untuk menelaah').waitFor();
    await fallbackPage.locator('.overview-case').first().click();
    await fallbackPage.getByRole('tab', { name: 'Ringkasan Kasus' }).waitFor(); await fallback.close();

    assert.deepEqual(errors, [], 'Uncaught browser errors');
    console.log('PASS: categories, map selection, filters, return camera, cached navigation, evidence, visits, keyboard tabs, history, empty state, list toggle, 4 viewports, retry and WebGL fallback.');
    console.log(`Screenshots: ${out}`);
  } catch (error) {
    console.error('Failed at URL:', page.url());
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true });
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
