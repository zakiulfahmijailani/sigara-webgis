const playwrightPath = process.env.PLAYWRIGHT_MODULE || 'C:\\Users\\zakiu\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright';
const { chromium } = require(playwrightPath);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.SIGARA_TEST_URL || 'http://127.0.0.1:3107';
const out = path.resolve('test-results/geoai-inline');
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

  console.log('--- TEST 1: Sikka Episode (290411124Y000018) Single GeoAI Image & Two Tabs ---');
  await page.goto(`${base}/episode/290411124Y000018`);
  await page.waitForSelector('.investigation-main');

  // Verify that GeoAI evidence is directly present on page below Sankey
  const evidenceSection = page.locator('#geoai-evidence');
  assert.ok(await evidenceSection.isVisible(), 'Inline GeoAI evidence section must be visible');

  // Verify section title and POC badge
  const sectionTitle = await page.locator('.geoai-section-header h3.section-title').innerText();
  console.log('Section title:', sectionTitle);
  assert.ok(sectionTitle.includes('Analisis GeoAI Episode Ini'), 'Must have Analisis GeoAI Episode Ini title');

  const pocBadge = await page.locator('.geoai-sim-badge').innerText();
  console.log('POC Badge:', pocBadge);
  assert.ok(pocBadge.includes('ILUSTRASI POC'), 'Must have ILUSTRASI POC badge');

  // Verify view tabs exist: [Penginderaan Jauh & GeoAI] and [Analisis Spasial]
  const tabs = page.locator('.geoai-view-tabs .view-tab-btn');
  assert.equal(await tabs.count(), 2, 'Must have exactly 2 local view tabs');
  const tab0Text = await tabs.nth(0).innerText();
  const tab1Text = await tabs.nth(1).innerText();
  console.log('Tabs:', tab0Text, '|', tab1Text);
  assert.ok(tab0Text.includes('Penginderaan Jauh'), 'Tab 0 must be Penginderaan Jauh');
  assert.ok(tab1Text.includes('Analisis Spasial'), 'Tab 1 must be Analisis Spasial');

  // Verify NO scenario buttons exist in UI
  const scenarioBtnCount = await page.locator('.scenario-btn, .scenario-buttons-group').count();
  assert.equal(scenarioBtnCount, 0, 'No scenario selector buttons should exist in UI');

  // Verify single primary image (Sikka scenario A v4)
  const imgA = page.locator('.evidence-main-img');
  const srcA = await imgA.getAttribute('src');
  console.log('Primary image src:', srcA);
  assert.ok(srcA && srcA.includes('01_NTT-01_banjir_A_v4.png'), 'Must display Sikka scenario A v4 image from Neon');

  // Verify caption header says "Interpretasi Analisis" (not Skenario A)
  const captionHead = await page.locator('.caption-head').innerText();
  console.log('Caption head:', captionHead);
  assert.ok(captionHead.includes('Interpretasi Analisis'), 'Must say Interpretasi Analisis');
  assert.ok(!captionHead.includes('Skenario A'), 'Must not have Skenario A in caption header');

  // Verify alt text does not contain Skenario
  const altText = await imgA.getAttribute('alt');
  console.log('Image alt text:', altText);
  assert.ok(!altText.toLowerCase().includes('skenario a'), 'Alt text should not contain Skenario A');

  await page.screenshot({ path: path.join(out, '01-sikka-remote-sensing.png'), fullPage: false });

  // Read master score before tab switch
  const scoreBefore = await page.locator('.score-large .value').first().innerText();

  console.log('--- TEST 2: Tab Switch to Analisis Spasial ---');
  // Click Analisis Spasial tab
  await tabs.nth(1).click();
  await page.waitForTimeout(400);

  // Verify spatial panel is visible
  const spatialPanel = page.locator('.geoai-spatial-panel');
  assert.ok(await spatialPanel.isVisible(), 'Spatial panel must be visible');

  // Verify OD corridor origin and destination
  const originName = await page.locator('.origin-point .point-name').innerText();
  const destName = await page.locator('.dest-point .point-name').innerText();
  console.log('Spatial OD:', originName, '->', destName);
  assert.ok(originName.length > 0 && destName.length > 0, 'Must show origin and destination');

  // Verify metric cards
  const metricCards = page.locator('.spatial-metric-grid .spatial-card');
  assert.equal(await metricCards.count(), 3, 'Must render 3 spatial metric cards');

  // Verify master score did NOT change
  const scoreAfter = await page.locator('.score-large .value').first().innerText();
  assert.equal(scoreBefore, scoreAfter, 'Master score must NOT change when switching tabs');

  await page.screenshot({ path: path.join(out, '02-sikka-spatial-analysis.png'), fullPage: false });

  // Switch back to Penginderaan Jauh
  await tabs.nth(0).click();
  await page.waitForTimeout(300);
  assert.ok(await imgA.isVisible(), 'Image should be visible again after switching back');

  console.log('--- TEST 3: Lightbox Modal & Escape Key ---');
  // Click Zoom button
  const zoomBtn = page.locator('.lightbox-trigger-btn');
  await zoomBtn.click();
  await page.waitForTimeout(300);

  const lightbox = page.locator('.geoai-lightbox-overlay');
  assert.ok(await lightbox.isVisible(), 'Lightbox modal should be visible');

  // Check lightbox title - no "Skenario A/B"
  const lightboxTitle = await page.locator('.lightbox-titles strong').innerText();
  console.log('Lightbox title:', lightboxTitle);
  assert.ok(!lightboxTitle.toLowerCase().includes('skenario a'), 'Lightbox title should not contain Skenario A');

  await page.screenshot({ path: path.join(out, '03-lightbox-open.png'), fullPage: false });

  // Press Escape to close
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  assert.ok(!(await lightbox.isVisible()), 'Lightbox should close after Escape');

  console.log('--- TEST 4: Kupang Episode (177250424P000119) ---');
  await page.goto(`${base}/episode/177250424P000119`);
  await page.waitForSelector('#geoai-evidence');

  const kupangImg = await page.locator('.evidence-main-img').getAttribute('src');
  console.log('Kupang image src:', kupangImg);
  assert.ok(kupangImg && kupangImg.includes('03_NTT-03_banjir_A_v4.png'), 'Kupang must show NTT-03 image');
  assert.ok(!kupangImg.includes('NTT-01'), 'Kupang must NOT show Sikka NTT-01 image');

  await page.screenshot({ path: path.join(out, '04-kupang-evidence.png'), fullPage: false });

  console.log('--- TEST 5: Manggarai Episode (496481024Y000339) ---');
  await page.goto(`${base}/episode/496481024Y000339`);
  await page.waitForSelector('#geoai-evidence');

  const manggaraiImg = await page.locator('.evidence-main-img').getAttribute('src');
  console.log('Manggarai image src:', manggaraiImg);
  assert.ok(manggaraiImg && manggaraiImg.includes('05_NTT-04_longsor_A_v4.png'), 'Manggarai must show NTT-04 image');

  await page.screenshot({ path: path.join(out, '05-manggarai-evidence.png'), fullPage: false });

  console.log('--- TEST 6: Category Scoping & High Reassigned Episode (192730424P000116) ---');
  // High episode 192730424P000116: hasGeoAI is false on master, but gets reassigned single primary evidence
  await page.goto(`${base}/episode/192730424P000116`);
  await page.waitForSelector('#geoai-evidence');

  const watumanuImg = await page.locator('.evidence-main-img').getAttribute('src');
  console.log('Reassigned high episode image src:', watumanuImg);
  assert.ok(watumanuImg && watumanuImg.includes('/api/geoai/evidence/'), 'Reassigned high episode must have an image');
  await page.screenshot({ path: path.join(out, '06-high-reassigned-evidence.png'), fullPage: false });

  // Low episode 192730824P000048 (RENDAH_SIM): NO gallery section
  await page.goto(`${base}/episode/192730824P000048`);
  await page.waitForSelector('.investigation-main');
  const lowEvidence = await page.locator('#geoai-evidence').count();
  assert.equal(lowEvidence, 0, 'RENDAH_SIM episode must NOT display #geoai-evidence section');

  // Medium episode 857570824P000041 (SEDANG_SIM): NO gallery section
  await page.goto(`${base}/episode/857570824P000041`);
  await page.waitForSelector('.investigation-main');
  const medEvidence = await page.locator('#geoai-evidence').count();
  assert.equal(medEvidence, 0, 'SEDANG_SIM episode must NOT display #geoai-evidence section');

  console.log('--- TEST 7: Mobile 390px Viewport ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce'
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${base}/episode/290411124Y000018`);
  await mobilePage.waitForSelector('#geoai-evidence');

  const noOverflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  console.log('Mobile 390px no horizontal overflow:', noOverflow);
  assert.ok(noOverflow, 'Mobile view should not horizontally overflow 390px');

  await mobilePage.screenshot({ path: path.join(out, '07-mobile-evidence-390px.png'), fullPage: true });

  await browser.close();

  if (errors.length > 0) {
    console.warn('Page errors encountered:', errors);
  }

  console.log('ALL GEOAI INLINE BROWSER TESTS PASSED SUCCESSFULLY!');
  console.log(`Screenshots saved to: ${out}`);
})().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
