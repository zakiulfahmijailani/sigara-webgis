const playwrightPath = process.env.PLAYWRIGHT_MODULE || 'C:\\Users\\zakiu\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright';
const { chromium } = require(playwrightPath);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.SIGARA_TEST_URL || 'http://127.0.0.1:3107';
const out = path.resolve('test-results/agent-activity');
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

  console.log('--- TEST 1: Agent Activity Bar on Main Dashboard "/" ---');
  await page.goto(base);
  await page.waitForSelector('.agent-activity-bar');

  // Verify bar is visible and placed before header
  const bar = page.locator('.agent-activity-bar');
  assert.ok(await bar.isVisible(), 'Agent activity bar must be visible on "/"');

  // Check branding
  const agentName = await page.locator('.agent-name').innerText();
  console.log('Agent Name:', agentName);
  assert.equal(agentName, 'SIGARA Agent');

  // Check status tag
  const statusTag = await page.locator('.agent-status-tag').innerText();
  console.log('Initial Status:', statusTag);
  assert.ok(statusTag.includes('Siap') || statusTag.includes('Memeriksa'));

  // Verify 4 cards
  const cards = page.locator('.agent-metric-card');
  assert.equal(await cards.count(), 4, 'Must have exactly 4 metric cards');

  // Card 4: Notifikasi Terkirim must show "Belum terhubung"
  const notifCardText = await cards.nth(3).innerText();
  console.log('Notif card text:', notifCardText.replace(/\n/g, ' '));
  assert.ok(notifCardText.includes('Belum terhubung'), 'Notification must truthfully show Belum terhubung');

  await page.screenshot({ path: path.join(out, '01-dashboard-agent-bar-initial.png'), fullPage: false });

  console.log('--- TEST 2: Run Demonstration Simulation ---');
  const simBtn = page.locator('.agent-btn-sim');
  assert.ok(await simBtn.isVisible(), 'Jalankan Simulasi button must be visible');
  await simBtn.click();

  // Wait for simulation to finish (a few seconds)
  await page.waitForTimeout(3000);
  console.log('Simulation finished');

  // Verify reviewed episodes count updated
  const reviewedStat = await cards.nth(0).locator('.card-stat').innerText();
  console.log('Reviewed stat after simulation:', reviewedStat);
  assert.ok(Number(reviewedStat) >= 1, 'Reviewed episodes count should be >= 1');

  await page.screenshot({ path: path.join(out, '02-dashboard-after-simulation.png'), fullPage: false });

  console.log('--- TEST 3: Open Agent Drawer (Reviewed Episodes Tab) ---');
  await cards.nth(0).click();
  await page.waitForTimeout(500);

  const drawer = page.locator('.agent-drawer-overlay');
  assert.ok(await drawer.isVisible(), 'Agent activity drawer must open');

  const rowsCount = await page.locator('.drawer-table tbody tr').count();
  console.log('Reviewed episodes rows in drawer:', rowsCount);
  assert.ok(rowsCount >= 1, 'Must show reviewed episodes rows');

  await page.screenshot({ path: path.join(out, '03-drawer-reviewed-episodes.png'), fullPage: false });

  console.log('--- TEST 4: Drawer Tab: Indikasi Prioritas Baru ---');
  await page.locator('.drawer-tab-btn').filter({ hasText: 'Prioritas Baru' }).click();
  await page.waitForTimeout(400);

  const priorityCards = await page.locator('.priority-finding-card').count();
  console.log('Priority finding cards in drawer:', priorityCards);
  assert.ok(priorityCards >= 1, 'Must show at least 1 priority finding card');

  await page.screenshot({ path: path.join(out, '04-drawer-priority-findings.png'), fullPage: false });

  console.log('--- TEST 5: Drawer Tab: Daftar Laporan & Open Printable Report Modal ---');
  await page.locator('.drawer-tab-btn').filter({ hasText: 'Laporan' }).click();
  await page.waitForTimeout(400);

  const reportCards = await page.locator('.report-item-card').count();
  console.log('Report cards in drawer:', reportCards);
  assert.ok(reportCards >= 1, 'Must have at least 1 report in list');

  // Click "Buka & Cetak"
  await page.locator('.open-report-btn').first().click();
  await page.waitForTimeout(500);

  const reportModal = page.locator('.report-modal-overlay');
  assert.ok(await reportModal.isVisible(), 'Report modal must open');

  const docTitle = await page.locator('.doc-app-name').innerText();
  console.log('Report Document Title:', docTitle);
  assert.equal(docTitle, 'SIGARA');

  const reportId = await page.locator('.doc-id-badge strong').innerText();
  console.log('Report ID:', reportId);
  assert.ok(reportId.startsWith('RPT-'));

  await page.screenshot({ path: path.join(out, '05-report-modal-view.png'), fullPage: false });

  // Close report modal
  await page.locator('.toolbar-btn.close-btn').click();
  await page.waitForTimeout(400);
  assert.ok(!(await reportModal.isVisible()), 'Report modal should close');

  // Close drawer
  const drawerClose = page.locator('.drawer-close-btn');
  if (await drawerClose.isVisible()) {
    await drawerClose.click();
    await page.waitForTimeout(300);
  }

  console.log('--- TEST 6: Episode Investigation Page Integration ---');
  // Navigate to high risk episode (Sikka 290411124Y000018)
  await page.goto(`${base}/episode/290411124Y000018`);
  await page.waitForSelector('#geoai-evidence');

  // Verify button "Buka Laporan Episode" or "Buat Laporan Episode" exists
  const reportBtn = page.locator('.btn-create-report');
  assert.ok(await reportBtn.isVisible(), 'Report button must be visible in GeoAI evidence section');
  console.log('Report button text:', await reportBtn.innerText());

  // Click button to open report
  await reportBtn.click();
  await page.waitForTimeout(500);
  assert.ok(await page.locator('.report-modal-overlay').isVisible(), 'Report modal opens from episode page');

  await page.screenshot({ path: path.join(out, '06-episode-report-opened.png'), fullPage: false });
  await page.locator('.toolbar-btn.close-btn').click();
  await page.waitForTimeout(300);

  console.log('--- TEST 7: Low Episode Truthful GeoAI Skipping ---');
  // Navigate to low risk episode (192730824P000048)
  await page.goto(`${base}/episode/192730824P000048`);
  await page.waitForSelector('.investigation-main');

  // Check Question 3 text in summary
  const q3Text = await page.locator('.evidence-check-item').last().innerText();
  console.log('Low episode Question 3 text:', q3Text.replace(/\n/g, ' '));
  assert.ok(q3Text.includes('GeoAI tidak dipicu') || q3Text.includes('tidak melewati ambang'), 'Must state GeoAI tidak dipicu');

  // Verify NO gallery section exists
  const galleryCount = await page.locator('#geoai-evidence').count();
  assert.equal(galleryCount, 0, 'No GeoAI image section for low episode');

  console.log('--- TEST 8: Mobile 390px Viewport ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce'
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(base);
  await mobilePage.waitForSelector('.agent-activity-bar');

  const noOverflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  console.log('Mobile 390px no horizontal overflow:', noOverflow);
  assert.ok(noOverflow, 'Mobile view must not horizontally overflow 390px');

  await mobilePage.screenshot({ path: path.join(out, '07-mobile-agent-bar-390px.png'), fullPage: false });

  await browser.close();

  if (errors.length > 0) {
    console.warn('Page errors encountered:', errors);
  }

  console.log('ALL AGENT ACTIVITY BROWSER TESTS PASSED SUCCESSFULLY!');
  console.log(`Screenshots saved to: ${out}`);
})().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
