const playwrightPath = process.env.PLAYWRIGHT_MODULE || 'C:\\Users\\zakiu\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright';
const { chromium } = require(playwrightPath);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.SIGARA_TEST_URL || 'http://127.0.0.1:3108';
const out = path.resolve('test-results/nav-cleanup');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || 'chrome',
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 950 },
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));

  console.log('--- TEST 1: Navigation Menu on "/" ---');
  await page.goto(base);
  await page.waitForSelector('.app-header');

  const navItems = page.locator('.header-nav .header-nav-item');
  const count = await navItems.count();
  console.log('Nav items count:', count);
  assert.equal(count, 3, 'Must have exactly 3 navigation items');

  const item0 = await navItems.nth(0).innerText();
  const item1 = await navItems.nth(1).innerText();
  const item2 = await navItems.nth(2).innerText();
  console.log('Nav items:', item0, '|', item1, '|', item2);

  assert.ok(item0.includes('Peta NTT'), 'Item 0 must be Peta NTT');
  assert.ok(item1.includes('Episode'), 'Item 1 must be Episode');
  assert.ok(item2.includes('Ringkasan'), 'Item 2 must be Ringkasan');

  // Verify "Contoh GeoAI" is NOT in navigation
  const allNavText = await page.locator('.header-nav').innerText();
  assert.ok(!allNavText.includes('Contoh GeoAI'), '"Contoh GeoAI" must NOT be in header nav');

  // Verify active status on "/"
  const isPetaActive = await navItems.nth(0).getAttribute('class');
  assert.ok(isPetaActive.includes('active'), 'Peta NTT must be active on "/"');

  await page.screenshot({ path: path.join(out, '01-nav-home-peta-active.png'), fullPage: false });

  console.log('--- TEST 2: Active status on "/episode" ---');
  await navItems.nth(1).click();
  await page.waitForSelector('.queue-header-section, .sigara-index-section, .episode-container, table');
  await page.waitForTimeout(500);

  const isEpisodeActive = await page.locator('.header-nav .header-nav-item').nth(1).getAttribute('class');
  assert.ok(isEpisodeActive.includes('active'), 'Episode must be active on "/episode"');
  await page.screenshot({ path: path.join(out, '02-nav-episode-active.png'), fullPage: false });

  console.log('--- TEST 3: Active status on "/ringkasan" ---');
  await page.locator('.header-nav .header-nav-item').nth(2).click();
  await page.waitForSelector('.summary-header, .province-summary');
  await page.waitForTimeout(500);

  const isRingkasanActive = await page.locator('.header-nav .header-nav-item').nth(2).getAttribute('class');
  assert.ok(isRingkasanActive.includes('active'), 'Ringkasan must be active on "/ringkasan"');
  await page.screenshot({ path: path.join(out, '03-nav-ringkasan-active.png'), fullPage: false });

  console.log('--- TEST 4: Direct URL access to "/contoh-geoai" still works ---');
  await page.goto(`${base}/contoh-geoai`);
  await page.waitForSelector('.catalogue-header, .geoai-catalogue-page, h1');
  const catalogueHeading = await page.locator('h1').innerText();
  console.log('Catalogue heading:', catalogueHeading);
  assert.ok(catalogueHeading.includes('GeoAI') || catalogueHeading.includes('Contoh'));

  // Header on /contoh-geoai should NOT have "Contoh GeoAI" in nav
  const catalogueNavItems = await page.locator('.header-nav .header-nav-item').count();
  assert.equal(catalogueNavItems, 3, 'Header on /contoh-geoai must also have exactly 3 nav items');

  await page.screenshot({ path: path.join(out, '04-direct-contoh-geoai-page.png'), fullPage: false });

  console.log('--- TEST 5: Episode Detail page GeoAI Evidence remains functional below Sankey ---');
  await page.goto(`${base}/episode/290411124Y000018`);
  await page.waitForSelector('.investigation-main');

  const evidence = page.locator('#geoai-evidence');
  assert.ok(await evidence.isVisible(), 'GeoAI evidence section must be visible on high episode');

  const image = page.locator('.evidence-main-img');
  assert.ok(await image.isVisible(), 'Evidence image must be visible');
  const imageSrc = await image.getAttribute('src');
  console.log('Evidence image src:', imageSrc);
  assert.ok(imageSrc.includes('01_NTT-01_banjir_A_v4.png'), 'Must load from Neon storage API');

  await page.screenshot({ path: path.join(out, '05-episode-detail-geoai-intact.png'), fullPage: false });

  console.log('--- TEST 6: Mobile Viewport (390px) ---');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.waitForSelector('.app-header');

  await page.screenshot({ path: path.join(out, '06-mobile-view-390px.png'), fullPage: false });

  await browser.close();
  console.log('All navigation cleanup tests passed successfully!');
  if (errors.length) console.warn('Page errors:', errors);
})();
