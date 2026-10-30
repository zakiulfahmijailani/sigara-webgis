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

  console.log('--- TEST 1: Sikka Episode (290411124Y000018) Inline Evidence Below Sankey ---');
  await page.goto(`${base}/episode/290411124Y000018`);
  await page.waitForSelector('.investigation-main');

  // Verify that GeoAI evidence is directly present on page without tab switching
  const evidenceSection = page.locator('#geoai-evidence');
  assert.ok(await evidenceSection.isVisible(), 'Inline GeoAI evidence section must be visible');

  // Verify section title and POC disclaimer
  const sectionTitle = await page.locator('.geoai-section-header h3.section-title').innerText();
  console.log('Section title:', sectionTitle);
  assert.ok(sectionTitle.includes('Bukti GeoAI'), 'Must have Bukti GeoAI title');

  const pocBadge = await page.locator('.geoai-sim-badge').innerText();
  console.log('POC Badge:', pocBadge);
  assert.ok(pocBadge.includes('SIMULASI POC'), 'Must have SIMULASI POC badge');

  // Check Scenario A image
  const imgA = page.locator('.evidence-main-img');
  const srcA = await imgA.getAttribute('src');
  console.log('Scenario A image src:', srcA);
  assert.ok(srcA && srcA.includes('01_NTT-01_banjir_A_v4.png'), 'Must display Sikka scenario A v4 image');

  // Check dimension info or aspect ratio
  const imgBox = await imgA.boundingBox();
  console.log('Image dimensions on screen:', imgBox ? `${imgBox.width}x${imgBox.height}` : 'null');

  await page.screenshot({ path: path.join(out, '01-sikka-scenario-a.png'), fullPage: false });

  // Read master score before scenario switch
  const scoreBefore = await page.locator('.score-large .value').first().innerText();

  console.log('--- TEST 2: Scenario B Switch ---');
  // Click Skenario B button
  const scenBBtn = page.locator('.scenario-btn').filter({ hasText: 'Skenario B' });
  await scenBBtn.click();
  await page.waitForTimeout(400);

  const srcB = await imgA.getAttribute('src');
  console.log('Scenario B image src:', srcB);
  assert.ok(srcB && srcB.includes('02_NTT-01_banjir_B_v4.png'), 'Must display Sikka scenario B v4 image');

  // Verify master score did NOT change
  const scoreAfter = await page.locator('.score-large .value').first().innerText();
  assert.equal(scoreBefore, scoreAfter, 'Master score must NOT change when toggling scenarios');

  await page.screenshot({ path: path.join(out, '02-sikka-scenario-b.png'), fullPage: false });

  console.log('--- TEST 3: Lightbox Modal & Escape Key ---');
  // Click Zoom button
  const zoomBtn = page.locator('.lightbox-trigger-btn');
  await zoomBtn.click();
  await page.waitForTimeout(300);

  const lightbox = page.locator('.geoai-lightbox-overlay');
  assert.ok(await lightbox.isVisible(), 'Lightbox modal should be visible');
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

  console.log('--- TEST 6: Episode Without GeoAI (192730424P000116) Truthful Missing State ---');
  await page.goto(`${base}/episode/192730424P000116`);
  await page.waitForSelector('#geoai-evidence');

  const missingCard = page.locator('.geoai-missing-card');
  assert.ok(await missingCard.isVisible(), 'Missing state card must be rendered');

  const missingText = await missingCard.innerText();
  console.log('Missing state text:', missingText.replace(/\n/g, ' '));
  assert.ok(missingText.includes('Belum Tersedia') || missingText.includes('belum memiliki berkas'), 'Truthful missing explanation required');

  // Verify NO v4 image from other episodes is displayed
  const anyImg = await page.locator('#geoai-evidence img').count();
  assert.equal(anyImg, 0, 'No image should be borrowed or shown for episode without GeoAI');

  await page.screenshot({ path: path.join(out, '06-missing-geoai-card.png'), fullPage: false });

  console.log('--- TEST 7: Legacy URL ?tab=evidence Normalization ---');
  await page.goto(`${base}/episode/290411124Y000018?tab=evidence`);
  await page.waitForTimeout(600);

  // Check current URL - ?tab=evidence should be removed or normalized
  const currentUrl = page.url();
  console.log('Normalized URL:', currentUrl);
  assert.ok(!currentUrl.includes('tab=evidence'), 'URL should have tab=evidence removed');

  console.log('--- TEST 8: Mobile 390px Viewport ---');
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
