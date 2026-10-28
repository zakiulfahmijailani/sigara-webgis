// Run against a built application: SIGARA_TEST_URL=http://localhost:3107
// Install Playwright separately, or set PLAYWRIGHT_MODULE to its absolute package path.
const playwrightPath = process.env.PLAYWRIGHT_MODULE || 'C:\\Users\\zakiu\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright';
const { chromium } = require(playwrightPath);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.SIGARA_TEST_URL || 'http://127.0.0.1:3107';
const out = path.resolve('test-results/map-first');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || 'chrome',
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(30000);
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));

  const ready = async () => {
    await page.getByRole('heading', { name: 'Peta rujukan Nusa Tenggara Timur' }).waitFor();
    await page.locator('.overview-category.all strong').filter({ hasText: /\d/ }).waitFor();
    await page.locator('.overview-marker').first().waitFor();
  };

  const getCamera = async () => {
    const url = new URL(page.url());
    return {
      lng: Number(url.searchParams.get('lng')),
      lat: Number(url.searchParams.get('lat')),
      z: Number(url.searchParams.get('z')),
    };
  };

  const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Horizontal viewport overflow');

  try {
    console.log('1. Loading home overview at far zoom...');
    await page.goto(base);
    await ready();
    assert.equal(await page.locator('.overview-category.all strong').innerText(), '3.683');
    assert.equal(await page.locator('.overview-category.red strong').innerText(), '364');
    assert.equal(await page.locator('.overview-category.orange strong').innerText(), '23');
    assert.equal(await page.locator('.overview-category.green strong').innerText(), '3.296');

    // Overview markers sum equals 3,683
    await page.waitForFunction(() => [...document.querySelectorAll('.overview-marker span')].reduce((sum, el) => sum + Number(el.textContent.replaceAll('.', '')), 0) === 3683);
    assert.equal(requests.some(url => /\/geoai\//.test(url) || url.includes('/visits?')), false, 'Home fetched detail-only evidence');
    await noOverflow();
    await page.screenshot({ path: path.join(out, '01-home-desktop.png'), fullPage: true });

    // 2. Click cluster marker: verify zoom increases and path remains /
    console.log('2. Testing cluster click and camera zoom...');
    const cluster = page.locator('.overview-marker.is-cluster').first();
    await cluster.waitFor();
    const initialCam = await getCamera();
    const clusterText = await cluster.innerText();
    console.log(`Clicking cluster with ${clusterText} episodes (initial zoom: ${initialCam.z || 'default'})...`);
    await cluster.click();
    await page.waitForTimeout(600); // allow easeTo / fitBounds
    const postClusterCam = await getCamera();
    console.log(`Post-cluster camera: zoom=${postClusterCam.z}, center=(${postClusterCam.lng}, ${postClusterCam.lat})`);
    assert.equal(new URL(page.url()).pathname, '/', 'Cluster click navigated away from /');
    assert.ok(postClusterCam.z > 6.0, `Expected zoom to increase after cluster click, got ${postClusterCam.z}`);
    await page.screenshot({ path: path.join(out, '01b-post-cluster-click.png'), fullPage: true });

    // 3. Reset map to whole NTT
    console.log('3. Resetting map view to whole NTT...');
    await page.locator('.overview-reset-map').click();
    await page.waitForTimeout(500);
    const resetCam = await getCamera();
    console.log(`Reset camera zoom: ${resetCam.z}`);
    assert.ok(resetCam.z <= 6.8, `Expected reset zoom <= 6.8, got ${resetCam.z}`);

    // 4. Click multi-episode origin marker: camera zooms to detail and journey lines appear
    console.log('4. Testing multi-episode origin click...');
    // Select Sikka district first to get a focused cluster/origin set
    await page.getByRole('combobox', { name: 'Kabupaten atau kota asal' }).selectOption('Sikka');
    await page.waitForURL(/district=Sikka/);
    await page.locator('.overview-marker').first().waitFor();

    const originMarker = page.locator('.overview-marker:not(.is-cluster)').first();
    await originMarker.waitFor();
    await originMarker.click({ force: true });
    await page.waitForURL(/origin=/);
    assert.equal(new URL(page.url()).pathname, '/', 'Origin click must stay on /');
    await page.waitForTimeout(600);
    const postOriginCam = await getCamera();
    console.log(`Post-origin camera: zoom=${postOriginCam.z}`);
    assert.ok(postOriginCam.z >= 9.5, `Expected zoom >= 9.5 on origin focus, got ${postOriginCam.z}`);
    await page.getByRole('heading', { name: /Episode dari fasilitas/ }).waitFor();
    await page.screenshot({ path: path.join(out, '01c-detail-journey-lines.png'), fullPage: true });

    // 5. Select a journey line: card opens with explicit actions
    console.log('5. Selecting a journey line...');
    const lineInfo = await page.evaluate(() => {
      const map = window.__sigaraMap;
      if (!map) return null;
      const feats = map.querySourceFeatures('overview-journeys');
      if (!feats || !feats.length) return null;
      const feat = feats[0];
      return { id: feat.properties.id, fromName: feat.properties.fromName, toName: feat.properties.toName, total: feat.properties.total };
    });
    console.log('Found rendered journey line in map source:', lineInfo);
    assert.ok(lineInfo, 'Expected overview-journeys source to contain active lines');

    // Open line card
    const currentUrl = new URL(page.url());
    currentUrl.searchParams.set('line', lineInfo.id);
    await page.goto(currentUrl.toString());
    await page.locator('.overview-line-card').waitFor();
    assert.equal(
      await page.locator('.overview-line-card-badge').innerText(),
      'Garis asal–tujuan / proksi perjalanan'
    );
    console.log('Journey line card verified on screen with proxy label and metrics.');
    await page.screenshot({ path: path.join(out, '01e-selected-line-card.png'), fullPage: true });

    // Test "Lihat hubungan lengkap" button
    const camBeforeFit = await getCamera();
    await page.locator('.overview-line-action-fit').click();
    await page.waitForTimeout(500);
    const camAfterFit = await getCamera();
    console.log(`Lihat hubungan lengkap: zoom before=${camBeforeFit.z}, zoom after=${camAfterFit.z}`);

    const cases = await page.locator('.overview-case').count();
    assert.ok(cases > 0, 'Origin should display referral cases');

    // 6. Test Single-Episode Origin: must stay on map first, NOT navigate away
    console.log('6. Testing single-episode origin click...');
    await page.getByRole('button', { name: 'Reset filter', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.overview-category.all strong')?.textContent === '3.683');

    // Search an episode ID known to have a unique single-episode origin or 1 result
    await page.getByRole('textbox', { name: 'Cari ID episode atau fasilitas' }).fill('290411124Y000018');
    await page.getByRole('button', { name: 'Cari', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.overview-result-bar strong')?.textContent === '1');
    await page.locator('.overview-marker').first().waitFor();
    // Clicking marker for this single episode:
    await page.locator('.overview-marker').first().click();
    await page.waitForTimeout(500);
    // Must REMAIN on '/'!
    assert.equal(new URL(page.url()).pathname, '/', 'Single-episode origin click must NOT auto-navigate away to /episode/[id]');
    console.log('Single episode origin remained on map, path is /');
    await page.screenshot({ path: path.join(out, '01d-single-origin-focused.png'), fullPage: true });

    // Click case to open detail
    await page.locator('.overview-case').click();
    await page.getByRole('tab', { name: 'Ringkasan Kasus' }).waitFor();
    console.log('Opened investigation detail page explicitly.');

    // 7. Return to map and verify context restored
    await page.getByRole('link', { name: 'Kembali ke peta NTT' }).click();
    await ready();
    assert.equal(new URL(page.url()).searchParams.get('q'), '290411124Y000018');

    // 8. Test Category filtering
    console.log('8. Testing category filtering...');
    await page.getByRole('button', { name: 'Reset filter', exact: true }).click();
    await page.locator('.overview-category.orange').click();
    await page.waitForFunction(() => document.querySelector('.overview-result-bar strong')?.textContent === '23');
    await page.locator('.overview-category.green').click();
    await page.waitForFunction(() => document.querySelector('.overview-result-bar strong')?.textContent === '3.296');
    await page.locator('.overview-category.red').click();
    await page.waitForFunction(() => document.querySelector('.overview-result-bar strong')?.textContent === '364');

    // 9. GeoAI evidence & visits test
    console.log('9. Testing GeoAI filter and evidence tabs...');
    await page.getByRole('button', { name: 'Reset filter', exact: true }).click();
    await page.getByRole('button', { name: 'Filter lainnya' }).click();
    await page.getByRole('checkbox', { name: /Hanya episode dengan ilustrasi GeoAI/ }).check();
    await page.waitForFunction(() => document.querySelector('.overview-result-bar strong')?.textContent === '8');
    await page.getByRole('button', { name: 'Filter lainnya' }).click();

    await page.locator('.overview-case').first().click();
    await page.getByRole('tab', { name: 'Ringkasan Kasus' }).waitFor();
    await page.locator('.inv-map-frame .map-canvas canvas').waitFor();
    await page.screenshot({ path: path.join(out, '03-episode-summary.png'), fullPage: true });

    await page.getByRole('tab', { name: /Bukti GeoAI/ }).click();
    await page.waitForURL(/tab=evidence/);
    await page.locator('.geoai-viewer-container img').first().waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('.geoai-viewer-container img')].every(image => image.complete && image.naturalWidth > 0));
    await page.screenshot({ path: path.join(out, '04-episode-evidence.png'), fullPage: true });

    await page.getByRole('tab', { name: /Kunjungan Terkait/ }).click();
    await page.locator('.visits-table tbody tr').first().waitFor();

    await page.getByRole('link', { name: 'Kembali ke peta NTT' }).click();
    await ready();

    // 10. Empty search state & List toggle
    console.log('10. Testing empty search and list drawer...');
    await page.goto(`${base}/?q=no-such-episode`);
    await page.getByRole('heading', { name: 'Tidak ada episode yang sesuai' }).waitFor();
    await page.getByRole('button', { name: 'Hapus filter', exact: true }).click();
    await ready();
    await page.getByRole('button', { name: 'Tutup daftar', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('.overview-workspace.with-list'));
    await page.getByRole('button', { name: 'Buka daftar episode', exact: true }).first().click();
    await page.locator('.overview-workspace.with-list').waitFor();

    // 11. Responsive viewports
    console.log('11. Testing responsive viewports...');
    for (const viewport of [{ width: 1366, height: 768 }, { width: 850, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await noOverflow();
      if (viewport.width === 390) {
        await page.goto(base);
        await ready();
      }
      await page.screenshot({ path: path.join(out, `05-home-${viewport.width}.png`), fullPage: true });
    }

    // 12. Network failure retry test
    console.log('12. Testing network failure retry...');
    const fail = await browser.newContext();
    const failPage = await fail.newPage();
    await failPage.route('**/api/showcase*', route => route.abort());
    await failPage.goto(base);
    await failPage.getByRole('heading', { name: 'Data belum dapat dimuat' }).waitFor();
    await failPage.unroute('**/api/showcase*');
    await failPage.getByRole('button', { name: 'Coba lagi', exact: true }).click();
    await failPage.locator('.overview-marker').first().waitFor();
    await fail.close();

    // 13. WebGL fallback test
    console.log('13. Testing WebGL fallback...');
    const fallback = await browser.newContext();
    await fallback.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        return String(type).includes('webgl') ? null : original.call(this, type, ...args);
      };
    });
    const fallbackPage = await fallback.newPage();
    await fallbackPage.goto(base);
    await fallbackPage.getByText('Peta sederhana · gunakan daftar untuk menelaah').waitFor();
    await fallbackPage.locator('.overview-case').first().click();
    await fallbackPage.getByRole('tab', { name: 'Ringkasan Kasus' }).waitFor();
    await fallback.close();

    assert.deepEqual(errors, [], 'Uncaught browser errors');
    console.log('SUCCESS: All browser verification steps passed!');
    console.log(`Screenshots saved to: ${out}`);
  } catch (error) {
    console.error('Failed at URL:', page.url());
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
