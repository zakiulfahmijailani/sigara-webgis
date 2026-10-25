import test from 'node:test';
import assert from 'node:assert/strict';

import summary from '../src/data/ntt-summary.json';
import episodes from '../src/data/ntt-episodes.json';
import geoai from '../src/data/ntt-geoai-manifest.json';
import {
  categoryFromMaster,
  labels,
  formatFacilityName,
  formatMinutes,
  formatKm,
  monthLabel,
  getReasonLabel,
} from '../src/lib/showcase';

test('UX-1. formatFacilityName cleans raw unnamed facility labels', () => {
  assert.equal(
    formatFacilityName('Faskes tanpa nama REF-1f0698cfd40449', 'tujuan'),
    'Faskes tujuan \u2014 nama belum tersedia'
  );
  assert.equal(
    formatFacilityName(null, 'asal'),
    'Faskes asal \u2014 nama belum tersedia'
  );
  assert.equal(
    formatFacilityName('RSUD Prof W Z Johannes', 'tujuan'),
    'RSUD Prof W Z Johannes'
  );
});

test('UX-2. Category mapping and labels adhere to Indonesian wording contract', () => {
  assert.equal(categoryFromMaster('TINGGI_SIM'), 'red');
  assert.equal(categoryFromMaster('SEDANG_SIM'), 'orange');
  assert.equal(categoryFromMaster('RENDAH_SIM'), 'green');

  assert.equal(labels.red, 'Indikasi tinggi (simulasi)');
  assert.equal(labels.orange, 'Indikasi sedang (simulasi)');
  assert.equal(labels.green, 'Indikasi rendah (simulasi)');
});

test('UX-3. Formatters provide human-readable units and null safety', () => {
  assert.equal(formatMinutes(null), 'Belum tersedia');
  assert.equal(formatKm(null), 'Belum tersedia');
  assert.ok(formatMinutes(45.5).includes('menit'));
  assert.ok(formatKm(12500).includes('km'));
  assert.equal(monthLabel('2024-05'), 'Mei 2024');
});

test('UX-4. GeoAI manifestation contains exactly 8 distinct demonstration episodes', () => {
  const geoaiIds = summary.geoaiEpisodeIds;
  assert.equal(geoaiIds.length, 8);

  for (const id of geoaiIds) {
    const ep = episodes.find((e) => e.id === id);
    assert.ok(ep, `GeoAI episode ${id} must exist in master episodes`);
    assert.equal(ep!.hasGeoAI, true);
    assert.equal(ep!.cat, 'TINGGI_SIM');

    const matchingImages = geoai.images.filter((img) => String(img.episode) === id);
    assert.equal(matchingImages.length, 2, `Episode ${id} must have exactly 2 scenarios`);
  }
});

test('UX-5. Reason labels cover key proxy and continuous care flags', () => {
  assert.equal(getReasonLabel('kontinuitas'), 'Kesinambungan perawatan');
  assert.equal(getReasonLabel('kapasitas_penuh'), 'Kapasitas alternatif penuh');
  assert.equal(getReasonLabel('layanan_khusus'), 'Kebutuhan layanan khusus');
});
