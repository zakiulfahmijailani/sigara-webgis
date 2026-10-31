// Run against a local app; API fixtures keep this check independent of database writes.
// SIGARA_TEST_URL=http://127.0.0.1:3128 node scripts/test-report-print.cjs
// Requires Python with pypdf; SIGARA_PYTHON can select the bundled runtime.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:\\Users\\zakiu\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const base = process.env.SIGARA_TEST_URL || 'http://127.0.0.1:3128';
const out = path.resolve('test-results/report-print');
const read = name => JSON.parse(fs.readFileSync(path.resolve('src/data',name),'utf8'));
const data = { summary: read('ntt-summary.json'), boundary: read('ntt-boundary.json'),
  districts: read('ntt-districts.json'), facilities: read('ntt-facilities.json'),
  episodes: read('ntt-episodes.json'), geoai: read('ntt-geoai-manifest.json') };
const episode = data.episodes.find(e => e.id === '857821124P001129');
assert.ok(episode);
fs.mkdirSync(out,{recursive:true});

(async () => {
  const browser = await chromium.launch({channel: process.env.BROWSER_CHANNEL || 'chrome',headless:true});
  let evidence;
  try {
    for (const variant of ['standard','scrolled-mobile','long']) {
      const context = await browser.newContext({viewport:variant === 'scrolled-mobile' ? {width:390,height:640} : {width:1366,height:900}});
      const page = await context.newPage();
      page.setDefaultTimeout(60000);
      const errors = [];
      page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/api/showcase?*', route=>route.fulfill({json:{data:{...data,episodes:[episode]},source:'neon'}}));
      await page.route('**/api/geoai/evidence/**', async route=> {
        if (!evidence) {
          const url = new URL(route.request().url());
          const response = await fetch('https://sigara-ntt.vercel.app'+url.pathname+url.search);
          assert.equal(response.status,200);
          evidence = Buffer.from(await response.arrayBuffer());
        }
        await route.fulfill({contentType:'image/png',body:evidence});
      });
      if (variant === 'long') {
        const report = {id:'RPT-'+episode.id,episodeId:episode.id,title:'Laporan panjang',createdAt:'2026-10-31T00:00:00Z',
          initialIndex:episode.fraudIdx,initialCategory:'high',fromName:episode.fromName,toName:episode.toName,
          altName:episode.altName,proxyDistanceKm:episode.distM/1000,timeRatio:episode.timeRatio,
          summary:'Ringkasan pemeriksaan perjalanan rujukan.',isSimulation:true,
          recommendations:Array.from({length:55},(_,i)=>`Rekomendasi ${i+1}: Verifikasi dokumen rujukan, kondisi akses, serta ketersediaan layanan dan tenaga kesehatan pada fasilitas tujuan sesuai tanggal kunjungan pasien.`)};
        await page.addInitScript(({report})=>localStorage.setItem('sigara-agent-activity-v4',JSON.stringify({
          version:'4.0.0',stats:{},reviewedEpisodes:{},reports:{[report.episodeId]:report},logs:[],notifications:[]
        })),{report});
      }
      await page.goto(base+'/episode/'+episode.id);
      await page.getByRole('button',{name:/Buat Laporan Episode|Buka Laporan Episode/}).click();
      const overlay = page.locator('.report-modal-overlay');
      await overlay.waitFor();
      assert.equal(await overlay.evaluate(el=>el.parentElement===document.body),true,'Report must be outside clipping app containers');
      await page.evaluate(()=>{window.print=()=>{window.__printRequested=true;};});
      if (variant === 'scrolled-mobile') await overlay.evaluate(el=>{el.scrollTop=el.scrollHeight;});
      await page.getByRole('button',{name:'Cetak / Simpan PDF'}).click();
      await page.waitForFunction(()=>window.__printRequested===true);
      if (variant !== 'long') assert.equal(await page.locator('#printable-report img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)),true);
      await page.emulateMedia({media:'print'});
      assert.equal(await overlay.evaluate(el=>getComputedStyle(el).overflowY),'visible');
      assert.equal(await page.locator('.report-modal-container').evaluate(el=>getComputedStyle(el).overflowY),'visible');
      assert.equal(await page.locator('.report-toolbar').evaluate(el=>getComputedStyle(el).display),'none');
      assert.equal(await page.evaluate(()=>Array.from(document.body.children)
        .filter(el=>!el.matches('.report-modal-overlay, script, style'))
        .every(el=>getComputedStyle(el).display==='none')),true,'Background app must not take up printed pages');
      await page.pdf({path:path.join(out,variant+'.pdf'),format:'A4',preferCSSPageSize:true,printBackground:true});
      await page.screenshot({path:path.join(out,variant+'-print.png'),fullPage:true});
      assert.deepEqual(errors,[]);
      console.log(variant+': print flow, images, portal and unclipped layout passed');
      await context.close();
    }
    execFileSync(process.env.SIGARA_PYTHON || 'python', ['-c', `
from pathlib import Path
from pypdf import PdfReader
import sys
for file in Path(sys.argv[1]).glob('*.pdf'):
    pages = [p.extract_text() for p in PdfReader(file).pages]
    assert all(len(text.strip()) > 40 for text in pages), f'{file.name}: blank page'
    assert any(all(label in text for label in ['Diverifikasi Sistem:', 'SIGARA AGENT VERIFIED',
        'Petugas Penelaah Lapangan:', 'Nama Terang Verifikator']) for text in pages), f'{file.name}: missing or split signatures'
    assert 'Dokumen ini dihasilkan' in ' '.join(pages), f'{file.name}: missing footer'
    if file.stem == 'long':
        assert all(f'Rekomendasi {i}:' in ' '.join(pages) for i in range(1,56)), 'Truncated recommendations'
    print(f'{file.name}: {len(pages)} pages, complete signatures and footer, no blank pages')
`, out], {stdio:'inherit'});
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
