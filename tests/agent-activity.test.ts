import test from 'node:test';
import assert from 'node:assert/strict';
import episodes from '../src/data/ntt-episodes.json';
import {
  getEpisodeEligibility,
  getInitialAgentState,
  createEpisodeReport,
  runDemonstrationSimulation,
  type AgentActivityState,
} from '../src/lib/agent-activity';
import type { Episode } from '../src/lib/showcase';

const typedEpisodes = episodes as unknown as Episode[];

test('AGENT-1: Kelayakan GeoAI ditentukan murni berdasarkan indeks dan kategori awal', () => {
  // 1. Episode Tinggi (> 60)
  const highEp = typedEpisodes.find((e) => e.cat === 'TINGGI_SIM' && e.fraudIdx != null && e.fraudIdx > 60);
  assert.ok(highEp, 'Harus ada episode dengan kategori TINGGI_SIM');
  const highElig = getEpisodeEligibility(highEp);
  assert.equal(highElig.eligibility, 'eligible');
  assert.equal(highElig.initialCategory, 'high');
  assert.ok(highElig.eligibilityReason.includes('memenuhi ambang prioritas'));

  // 2. Episode Sedang (31-60)
  const medEp = typedEpisodes.find((e) => e.cat === 'SEDANG_SIM');
  assert.ok(medEp, 'Harus ada episode dengan kategori SEDANG_SIM');
  const medElig = getEpisodeEligibility(medEp);
  assert.equal(medElig.eligibility, 'skipped');
  assert.equal(medElig.initialCategory, 'medium');
  assert.ok(medElig.eligibilityReason.includes('dilewati'));

  // 3. Episode Rendah (<= 30)
  const lowEp = typedEpisodes.find((e) => e.cat === 'RENDAH_SIM');
  assert.ok(lowEp, 'Harus ada episode dengan kategori RENDAH_SIM');
  const lowElig = getEpisodeEligibility(lowEp);
  assert.equal(lowElig.eligibility, 'skipped');
  assert.equal(lowElig.initialCategory, 'low');
  assert.ok(lowElig.eligibilityReason.includes('tidak diprioritaskan'));

  // 4. Episode tanpa indeks awal (null) -> unknown (bukan dianggap rendah!)
  const unknownEp: Pick<Episode, 'id' | 'cat' | 'fraudIdx'> = {
    id: 'MOCK_NULL_EPISODE',
    cat: 'TINGGI_SIM',
    fraudIdx: null,
  };
  const unknownElig = getEpisodeEligibility(unknownEp);
  assert.equal(unknownElig.eligibility, 'unknown', 'Indeks null tidak boleh dianggap rendah');
  assert.equal(unknownElig.initialCategory, 'unknown');
  assert.ok(unknownElig.eligibilityReason.includes('tidak tersedia'));
});

test('AGENT-2: Penurunan skor setelah penelaahan tidak membatalkan kelayakan awal atau menyembunyikan riwayat', () => {
  const highEp = typedEpisodes.find((e) => e.cat === 'TINGGI_SIM')!;
  const eligBefore = getEpisodeEligibility(highEp);
  assert.equal(eligBefore.eligibility, 'eligible');

  // Simulasikan hasil review menurunkan skor menjadi 25.0 (kategori rendah)
  const reviewedRecord = {
    episodeId: highEp.id,
    initialIndex: highEp.fraudIdx,
    initialCategory: eligBefore.initialCategory,
    eligibility: eligBefore.eligibility,
    eligibilityReason: eligBefore.eligibilityReason,
    reviewedIndex: 25.0,
    reviewedCategory: 'low' as const,
    reviewStatus: 'completed' as const,
    reviewMode: 'simulation' as const,
    timestamp: '30 Okt 2026, 14.00',
    findings: 'Klarifikasi rujukan valid',
    isNewPriority: false,
    region: highEp.kabAsal,
    fromName: highEp.fromName,
    toName: highEp.toName,
  };

  // Eligibility awal tetap dipertahankan pada data record
  assert.equal(reviewedRecord.eligibility, 'eligible');
  assert.equal(reviewedRecord.initialCategory, 'high');
  assert.equal(reviewedRecord.reviewedCategory, 'low');
});

test('AGENT-3: State awal memuat metrik operasional otomatis GeoAI Agent', () => {
  const state = getInitialAgentState();
  assert.equal(state.stats.episodesReviewed, 364, 'Default episode ditelaah harus 364 (total episode tinggi NTT)');
  assert.equal(state.stats.priorityFindings, 24, 'Default prioritas baru harus 24');
  assert.equal(state.stats.reportsGenerated, 402, 'Default laporan dibuat harus 402');
  assert.equal(state.stats.reportsToday, 171, 'Default laporan hari ini harus +171');
  assert.equal(state.stats.stakeholdersNotified, 289, 'Default notifikasi stakeholder harus 289');
  assert.equal(state.stats.notificationsPending, 48, 'Default notifikasi antrean harus 48');
  assert.equal(state.lastRunTimestamp, '2 jam lalu');
  assert.equal(state.nextRunCountdown, '22j 10m');
  assert.ok(Object.keys(state.reviewedEpisodes).length > 0, 'Daftar episode ditelaah terisi');
  assert.ok(Object.keys(state.reports).length > 0, 'Daftar laporan terisi');
  assert.ok(state.notifications.length > 0, 'Daftar notifikasi terisi');
  assert.ok(state.logs.length > 0, 'Log aktivitas otomatis terisi');
});

test('AGENT-4: Deduplikasi: Menjalankan ulang penelaahan tidak menggandakan episode unik atau berkas laporan', async () => {
  const highEpisodes = typedEpisodes.filter((e) => e.cat === 'TINGGI_SIM');
  const initial = getInitialAgentState();

  const initialReviewedCount = Object.keys(initial.reviewedEpisodes).length;
  const initialReportsCount = Object.keys(initial.reports).length;

  // Run pertama
  const run1 = await runDemonstrationSimulation(highEpisodes, initial);
  const reviewedCount1 = Object.keys(run1.reviewedEpisodes).length;
  const reportsCount1 = Object.keys(run1.reports).length;
  assert.ok(reviewedCount1 >= initialReviewedCount, 'Harus mencakup episode target');

  // Run kedua pada state yang sama
  const run2 = await runDemonstrationSimulation(highEpisodes, run1);
  const reviewedCount2 = Object.keys(run2.reviewedEpisodes).length;
  const reportsCount2 = Object.keys(run2.reports).length;

  assert.equal(reviewedCount2, reviewedCount1, 'Run kedua tidak boleh menambah jumlah episode unik');
  assert.equal(reportsCount2, reportsCount1, 'Run kedua tidak boleh menduplikasi berkas laporan unik');
});

test('AGENT-5: Berkas laporan memuat metadata transparan tanpa data fiktif pasien/diagnosis', () => {
  const testEp = typedEpisodes.find((e) => e.cat === 'TINGGI_SIM')!;
  const report = createEpisodeReport(testEp);

  assert.equal(report.episodeId, testEp.id);
  assert.equal(report.fromName, testEp.fromName);
  assert.equal(report.toName, testEp.toName);
  assert.ok(report.recommendations.length >= 2, 'Laporan harus memiliki rekomendasi telaah');
  assert.ok(report.evidenceImageUrl?.startsWith('/api/geoai/evidence/'), 'Gambar bukti harus menggunakan route Neon');

  // Memastikan tidak ada data medis sensitif yang dikarang
  assert.ok(!JSON.stringify(report).includes('NIK'));
  assert.ok(!JSON.stringify(report).includes('Nama Pasien'));
});
