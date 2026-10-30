const playwrightPath = process.env.PLAYWRIGHT_MODULE || 'C:\\Users\\zakiu\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright';
const { chromium } = require(playwrightPath);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.SIGARA_TEST_URL || 'http://127.0.0.1:3107';
const out = path.resolve('test-results/sigara-index');
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

  console.log('--- TEST 1: Dashboard "/" and Methodology Disclosure ---');
  await page.goto(base);
  await page.waitForSelector('.overview-category.all strong');

  // Verify category group title
  const catTitle = await page.locator('.overview-category-title').innerText();
  console.log('Category label:', catTitle);
  assert.ok(catTitle.toUpperCase().includes('SIGARA INDEX'));

  // Take dashboard screenshot
  await page.screenshot({ path: path.join(out, '01-dashboard-index-summary.png'), fullPage: false });

  // Open "Bagaimana indeks dibentuk?"
  console.log('Opening global methodology disclosure...');
  const openMethodologyBtn = page.getByRole('button', { name: 'Bagaimana indeks dibentuk?' });
  await openMethodologyBtn.click();
  await page.waitForTimeout(600);

  // Verify Sankey SVG is rendered
  const svgExists = await page.locator('.index-data-flow-container svg.sankey-svg').isVisible();
  assert.ok(svgExists, 'Sankey SVG should be visible inside methodology disclosure');

  // Verify 8 source options
  const sourceSelect = page.locator('select[aria-label="Telusuri sumber data pada diagram Sankey"]');
  const optionsCount = await sourceSelect.locator('option').count();
  console.log(`Found ${optionsCount} source options (expected 9: Semua + 8 sources)`);
  assert.equal(optionsCount, 9);

  await page.screenshot({ path: path.join(out, '02-dashboard-sankey-open.png'), fullPage: false });

  // Filter Copernicus source
  console.log('Filtering Copernicus Earth Engine source in Sankey...');
  await sourceSelect.selectOption('satellite');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '03-dashboard-copernicus-filtered.png'), fullPage: false });

  console.log('--- TEST 2: Episode Selection & Compact Card ---');
  // Click "Pratinjau Indeks" on first episode in list
  const previewBtn = page.locator('button', { hasText: 'Pratinjau Indeks' }).first();
  await previewBtn.click();
  await page.waitForTimeout(500);

  // Verify compact SigaraIndexCard is rendered at top of panel
  const compactCard = await page.locator('.sigara-index-card-compact').isVisible();
  assert.ok(compactCard, 'Compact index card should be visible in right panel');

  // Verify button "Lihat rincian indeks & aliran data"
  const detailBtn = page.locator('a', { hasText: 'Lihat rincian indeks & aliran data' });
  assert.ok(await detailBtn.isVisible(), 'Link to full investigation should be visible in compact card');

  await page.screenshot({ path: path.join(out, '04-map-episode-selected-card.png'), fullPage: false });

  console.log('--- TEST 3: Full Episode Investigation Page (has GeoAI) ---');
  // Navigate to benchmark case with GeoAI: 290411124Y000018
  await page.goto(`${base}/episode/290411124Y000018`);
  await page.waitForSelector('.investigation-main');

  // Verify prominent SigaraIndexCard
  const fullCard = await page.locator('.sigara-index-card-full').first().isVisible();
  assert.ok(fullCard, 'Full SigaraIndexCard should be visible on episode page');

  // Verify 4-pillar breakdown
  const pillarBars = await page.locator('.pillar-card').count();
  console.log(`Found ${pillarBars} pillar cards (expected 4)`);
  assert.equal(pillarBars, 4);

  await page.screenshot({ path: path.join(out, '05-episode-detail-master.png'), fullPage: true });

  // Toggle to Multipillar Demo mode
  console.log('Switching to Simulasi model multipilar (v2 POC)...');
  await page.locator('.mode-btn').filter({ hasText: 'Simulasi multipilar' }).click();
  await page.waitForTimeout(400);

  // Verify demo disclaimer banner
  const disclaimer = await page.locator('.disclaimer-p').isVisible();
  assert.ok(disclaimer, 'Simulation disclaimer banner should be displayed in demo mode');

  await page.screenshot({ path: path.join(out, '06-episode-detail-multipillar-demo.png'), fullPage: true });

  console.log('--- TEST 4: Inline GeoAI Evidence Below Sankey ---');
  const inlineGeoAI = page.locator('#geoai-evidence');
  assert.ok(await inlineGeoAI.isVisible(), 'Inline GeoAI evidence should be rendered below Sankey');

  const evidenceImg = page.locator('.evidence-main-img');
  assert.ok(await evidenceImg.isVisible(), 'Evidence main image should be rendered');

  await page.screenshot({ path: path.join(out, '07-episode-geoai-breakdown.png'), fullPage: true });

  console.log('--- TEST 5: Methods Tab & 12 Variables Details ---');
  await page.getByRole('tab', { name: /Metode & Sumber/ }).click();
  await page.waitForTimeout(500);

  const variablesTable = await page.locator('.source-variable-details').isVisible();
  assert.ok(variablesTable, '12 Variables table should be rendered in methods tab');

  const varRows = await page.locator('.variables-table tbody tr').count();
  console.log(`Found ${varRows} variable rows in table (expected 12)`);
  assert.equal(varRows, 12);

  console.log('--- TEST 6: Full-width Sankey on Episode Page ---');
  await page.getByRole('tab', { name: /Ringkasan Kasus/ }).click();
  await page.locator('#index-data-flow').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const epSankey = await page.locator('#index-data-flow svg.sankey-svg').isVisible();
  assert.ok(epSankey, 'Full-width Sankey should be visible below grid on episode page');
  await page.screenshot({ path: path.join(out, '08-episode-sankey-fullwidth.png'), fullPage: false });

  console.log('--- TEST 7: Truthful Missing Data State (No GeoAI) ---');
  // Episode 192730424P000116 has no GeoAI
  await page.goto(`${base}/episode/192730424P000116`);
  await page.waitForSelector('.investigation-main');

  // Toggle to multipillar demo
  await page.locator('.mode-btn').filter({ hasText: 'Simulasi multipilar' }).click();
  await page.waitForTimeout(400);

  // In multipillar demo, total score should show "null" / "Belum dapat dihitung"
  const missingText = await page.locator('.sigara-index-card-full').innerText();
  console.log('Missing data episode card text sample:', missingText.substring(0, 160).replace(/\n/g, ' '));
  assert.ok(missingText.includes('Belum dapat dihitung') || missingText.includes('GeoAI belum lengkap') || missingText.includes('—'), 'Truthful missing status should be shown');

  await page.screenshot({ path: path.join(out, '09-episode-missing-geoai.png'), fullPage: true });

  console.log('--- TEST 8: Mobile Responsive Viewport (390px) ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce'
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${base}/episode/290411124Y000018`);
  await mobilePage.waitForSelector('.investigation-main');

  // Verify horizontal scrollbar does not overflow
  const noOverflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  console.log('Mobile 390px no horizontal overflow:', noOverflow);
  assert.ok(noOverflow, 'Mobile view should not horizontally overflow 390px');

  await mobilePage.screenshot({ path: path.join(out, '10-mobile-sankey-vertical.png'), fullPage: true });

  await browser.close();

  if (errors.length > 0) {
    console.warn('Page errors occurred:', errors);
  }

  console.log('ALL SIGARA INDEX UI TESTS PASSED SUCCESSFULLY!');
  console.log(`Screenshots saved to: ${out}`);
})().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
