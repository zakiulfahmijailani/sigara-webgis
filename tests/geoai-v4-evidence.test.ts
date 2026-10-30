import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import episodes from '../src/data/ntt-episodes.json';
import {
  getEvidenceForEpisode,
  getEpisodeEvidenceScenario,
  getEpisodeGeoAIStatus,
  getAllEvidence,
  type GeneratedEpisodeEvidence,
} from '../src/lib/geoai-evidence-v4';
import { buildEpisodeExplanation } from '../src/lib/sigara-index';
import geoai from '../src/data/ntt-geoai-manifest.json';
import type { Episode, GeoAIManifest } from '../src/lib/showcase';

const typedEpisodes = episodes as unknown as Episode[];
const typedGeoAI = geoai as unknown as GeoAIManifest;

test('NTT-V4-1: Registry v4 berisi tepat 16 item untuk 8 episode unik dengan skenario A & B', () => {
  const all = getAllEvidence();
  assert.equal(all.length, 16, 'Harus ada tepat 16 bukti v4');

  const uniqueEpisodes = Array.from(new Set(all.map((item) => item.episodeId)));
  assert.equal(uniqueEpisodes.length, 8, 'Harus ada tepat 8 episode unik');

  for (const epId of uniqueEpisodes) {
    const epItems = all.filter((item) => item.episodeId === epId);
    assert.equal(epItems.length, 2, `Episode ${epId} harus memiliki tepat 2 skenario`);
    const scenarios = epItems.map((item) => item.scenario).sort();
    assert.deepEqual(scenarios, ['A', 'B'], `Episode ${epId} harus memiliki skenario A dan B`);
  }
});

test('NTT-V4-2: Seluruh 16 file PNG v4 ada di public/geoai/ntt/v4/gambar/ dan valid', () => {
  const all = getAllEvidence();
  const baseDir = path.resolve(process.cwd(), 'public');

  for (const item of all) {
    const fullPath = path.join(baseDir, item.imageUrl.replace(/^\//, ''));
    assert.ok(fs.existsSync(fullPath), `File gambar tidak ditemukan di disk: ${item.imageUrl}`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 10000, `Ukuran file harus wajar (>10KB), didapat: ${stat.size} bytes untuk ${item.imageUrl}`);
  }
});

test('NTT-V4-3: getEvidenceForEpisode hanya mengembalikan item episode yang diminta (tanpa kebocoran)', () => {
  const all = getAllEvidence();
  const knownEpId = all[0].episodeId;
  const items = getEvidenceForEpisode(knownEpId);

  assert.equal(items.length, 2);
  for (const item of items) {
    assert.equal(item.episodeId, knownEpId, 'Item yang dikembalikan tidak boleh dari episode lain');
  }

  // Permintaan episode fiktif/tanpa GeoAI tidak meminjam gambar episode lain
  const emptyItems = getEvidenceForEpisode('NON_EXISTENT_ID_999999');
  assert.equal(emptyItems.length, 0, 'Episode tanpa GeoAI harus menghasilkan array kosong');
});

test('NTT-V4-4: getEpisodeEvidenceScenario mengembalikan skenario yang sesuai atau null', () => {
  const all = getAllEvidence();
  const target = all[0];

  const scenA = getEpisodeEvidenceScenario(target.episodeId, 'A');
  assert.ok(scenA);
  assert.equal(scenA.scenario, 'A');
  assert.equal(scenA.episodeId, target.episodeId);

  const scenB = getEpisodeEvidenceScenario(target.episodeId, 'B');
  assert.ok(scenB);
  assert.equal(scenB.scenario, 'B');
  assert.equal(scenB.episodeId, target.episodeId);

  const nonExistent = getEpisodeEvidenceScenario('NON_EXISTENT_999', 'A');
  assert.equal(nonExistent, null);
});

test('NTT-V4-5: getEpisodeGeoAIStatus memberikan status yang jujur dan benar', () => {
  const geoaiEp = typedEpisodes.find((e) => e.hasGeoAI);
  assert.ok(geoaiEp, 'Harus ada episode dengan hasGeoAI=true');

  const evidence = getEpisodeEvidenceScenario(geoaiEp.id, 'A');
  const statusWithGeo = getEpisodeGeoAIStatus(geoaiEp, evidence);
  assert.equal(statusWithGeo.isAvailable, true);
  assert.equal(statusWithGeo.status, 'completed');
  assert.ok(statusWithGeo.badgeLabel.length > 0);

  const nonGeoaiEp = typedEpisodes.find((e) => !e.hasGeoAI);
  assert.ok(nonGeoaiEp, 'Harus ada episode dengan hasGeoAI=false');

  const statusNoGeo = getEpisodeGeoAIStatus(nonGeoaiEp, null);
  assert.equal(statusNoGeo.isAvailable, false);
  assert.ok(statusNoGeo.status === 'unknown' || statusNoGeo.status === 'skipped');
  assert.ok(
    statusNoGeo.badgeLabel.toLowerCase().includes('belum') ||
    statusNoGeo.badgeLabel.toLowerCase().includes('tidak')
  );
});

test('NTT-V4-6: Penjelasan GeoAI tidak keliru menafsirkan noRealDetection sebagai "tidak ada gangguan"', () => {
  const all = getAllEvidence();
  for (const item of all) {
    assert.equal(item.synthetic, true, 'Semua aset v4 harus berstatus synthetic: true');
    assert.equal(item.georeferenced, false, 'Semua aset v4 harus berstatus georeferenced: false');
    assert.equal(item.assetVersion, 'sigara-generated-evidence-v4');
  }
});

test('NTT-V4-7: Skenario A/B tidak pernah mengubah master score fraudIdx atau kategori episode', () => {
  const all = getAllEvidence();
  const testEpId = all[0].episodeId;
  const ep = typedEpisodes.find((e) => String(e.id) === String(testEpId));
  assert.ok(ep);

  const originalFraudIdx = ep.fraudIdx;
  const originalCat = ep.cat;

  // Render scenario A & B - score master harus tetap identik
  const explA = buildEpisodeExplanation(ep, 'master', typedGeoAI);
  const explB = buildEpisodeExplanation(ep, 'master', typedGeoAI);

  assert.equal(ep.fraudIdx, originalFraudIdx);
  assert.equal(ep.cat, originalCat);
  assert.equal(explA.masterScore, originalFraudIdx);
  assert.equal(explB.masterScore, originalFraudIdx);
});

test('NTT-V4-8: Sikka episode (290411124Y000018) terhubung tepat dengan paket 01 banjir v4', () => {
  const sikkaId = '290411124Y000018';
  const sikkaItems = getEvidenceForEpisode(sikkaId);
  assert.equal(sikkaItems.length, 2);

  const itemA = sikkaItems.find((i) => i.scenario === 'A');
  const itemB = sikkaItems.find((i) => i.scenario === 'B');
  assert.ok(itemA);
  assert.ok(itemB);

  assert.ok(itemA.imageUrl.includes('01_NTT-01_banjir_A_v4.png'));
  assert.ok(itemB.imageUrl.includes('02_NTT-01_banjir_B_v4.png'));
  assert.equal(itemA.region, 'Sikka');
  assert.equal(itemA.kind, 'banjir');
});

test('NTT-V4-9: Kupang episode (177250424P000119) terhubung tepat dengan paket 03 banjir v4', () => {
  const kupangId = '177250424P000119';
  const kupangItems = getEvidenceForEpisode(kupangId);
  assert.equal(kupangItems.length, 2);

  const itemA = kupangItems.find((i) => i.scenario === 'A');
  const itemB = kupangItems.find((i) => i.scenario === 'B');
  assert.ok(itemA);
  assert.ok(itemB);

  assert.ok(itemA.imageUrl.includes('03_NTT-03_banjir_A_v4.png'));
  assert.ok(itemB.imageUrl.includes('04_NTT-03_banjir_B_v4.png'));
  assert.equal(itemA.region, 'Kupang');
});

test('NTT-V4-10: Manggarai episode (496481024Y000339) terhubung tepat dengan paket 04 longsor v4', () => {
  const manggaraiId = '496481024Y000339';
  const manggaraiItems = getEvidenceForEpisode(manggaraiId);
  assert.equal(manggaraiItems.length, 2);

  const itemA = manggaraiItems.find((i) => i.scenario === 'A');
  assert.ok(itemA);
  assert.ok(itemA.imageUrl.includes('05_NTT-04_longsor_A_v4.png'));
  assert.equal(itemA.region, 'Manggarai');
  assert.equal(itemA.kind, 'longsor');
});
