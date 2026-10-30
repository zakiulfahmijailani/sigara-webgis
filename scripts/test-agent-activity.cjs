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

  // Verify bar is visible
  const bar = page.locator('.agent-activity-bar');
  assert.ok(await bar.isVisible(), 'Agent activity bar must be visible on "/"');

  // Check branding
  const agentName = await page.locator('.agent-name').innerText();
  console.log('Agent Name:', agentName);
  assert.equal(agentName, 'SIGARA Agent');

  // Check status tag
  const statusTag = await page.locator('.agent-status-tag').innerText();
  console.log('Agent Status:', statusTag);
  assert.ok(statusTag.includes('Aktif'));

  // Check automated context
  const contextCol = await page.locator('.agent-context-col').innerText();
  console.log('Agent Context:', contextCol.replace(/\n/g, ' '));
  assert.ok(contextCol.includes('Analisis terakhir'));
  assert.ok(contextCol.includes('Jadwal berikutnya'));

  // Verify 4 cards have pre-populated metrics
  const cards = page.locator('.agent-metric-card');
  assert.equal(await cards.count(), 4, 'Must have exactly 4 metric cards');

  // Card 1: 364 (+18)
  const card1Text = await cards.nth(0).innerText();
  console.log('Card 1:', card1Text.replace(/\n/g, ' '));
  assert.ok(card1Text.includes('364'), 'Episode ditelaah should default to 364');

  // Card 2: 24 (1 KRITIS)
  const card2Text = await cards.nth(1).innerText();
  console.log('Card 2:', card2Text.replace(/\n/g, ' '));
  assert.ok(card2Text.includes('24'), 'Prioritas baru should default to 24');

  // Card 3: 402 (+171)
  const card3Text = await cards.nth(2).innerText();
  console.log('Card 3:', card3Text.replace(/\n/g, ' '));
  assert.ok(card3Text.includes('402'), 'Laporan dibuat should default to 402');

  // Card 4: 289 (48)
  const card4Text = await cards.nth(3).innerText();
  console.log('Card 4:', card4Text.replace(/\n/g, ' '));
  assert.ok(card4Text.includes('289'), 'Notifikasi should default to 289');

  // Verify NO manual run button exists (agentic GeoAI runs automatically)
  const simBtnCount = await page.locator('.agent-btn-sim').count();
  assert.equal(simBtnCount, 0, 'No manual Jalankan Simulasi button should exist');

  await page.screenshot({ path: path.join(out, '01-dashboard-agent-bar-initial.png'), fullPage: false });

  console.log('--- TEST 2: Open Agent Drawer via "Lihat Aktivitas" ---');
  const viewBtn = page.locator('.agent-btn-view');
  assert.ok(await viewBtn.isVisible(), 'Lihat Aktivitas button must be visible');
  await viewBtn.click();
  await page.waitForTimeout(500);

  const drawer = page.locator('.agent-drawer-overlay');
  assert.ok(await drawer.isVisible(), 'Agent activity drawer must open');

  console.log('--- TEST 3: Drawer Tab: Episode Ditelaah ---');
  await page.locator('.drawer-tab-btn').filter({ hasText: 'Episode Ditelaah' }).click();
  await page.waitForTimeout(400);

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

  console.log('--- TEST 6: Episode Page Integration for High Episode ---');
  await page.goto(`${base}/episode/290411124Y000018`);
  await page.waitForSelector('.investigation-main');

  const btnCreateReport = page.locator('.btn-create-report');
  assert.ok(await btnCreateReport.isVisible(), 'Episode page must have Buat/Buka Laporan Episode button');

  // Click create/open report
  await btnCreateReport.click();
  await page.waitForTimeout(500);

  assert.ok(await page.locator('.report-modal-overlay').isVisible(), 'Report modal should open from episode page');
  await page.screenshot({ path: path.join(out, '06-episode-report-opened.png'), fullPage: false });

  await page.locator('.toolbar-btn.close-btn').click();
  await page.waitForTimeout(300);

  console.log('--- TEST 7: Episode Page: Low/Medium episode skips GeoAI ---');
  await page.goto(`${base}/episode/204560624P000006`);
  await page.waitForSelector('.investigation-main');

  const inlineEvidence = page.locator('.inline-geoai-evidence-section');
  assert.equal(await inlineEvidence.count(), 0, 'Inline GeoAI section should be skipped for low episode');

  const auditCheck3 = await page.locator('.evidence-check-item').nth(2).innerText();
  console.log('Audit check 3 text for low episode:', auditCheck3.replace(/\n/g, ' '));
  assert.ok(auditCheck3.includes('tidak melewati ambang') || auditCheck3.includes('Tidak Dipicu'));

  console.log('--- TEST 8: Mobile Viewport (390px) ---');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.waitForSelector('.agent-activity-bar');

  assert.ok(await page.locator('.agent-activity-bar').isVisible(), 'Agent bar must be visible on mobile');
  assert.ok(await page.locator('.agent-btn-view').isVisible(), 'Lihat Aktivitas must be visible on mobile');

  await page.screenshot({ path: path.join(out, '07-mobile-agent-bar-390px.png'), fullPage: false });

  await browser.close();

  console.log('All 8 agent activity test scenarios passed successfully!');
  if (errors.length) {
    console.warn('Page errors caught during test:', errors);
  }
})();
