import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import summary from '../src/data/ntt-summary.json';
import episodes from '../src/data/ntt-episodes.json';
import facilities from '../src/data/ntt-facilities.json';
import geoai from '../src/data/ntt-geoai-manifest.json';
import boundary from '../src/data/ntt-boundary.json';
import districts from '../src/data/ntt-districts.json';

test('1. Total visits, episodes, and participants match specification', () => {
  assert.equal(summary.totals.visits, 10776);
  assert.equal(summary.totals.episodes, 3683);
  assert.equal(summary.totals.participants, 2329);
  assert.equal(episodes.length, 3683);

  // All episode IDs are unique strings
  const ids = new Set(episodes.map((e) => String(e.id)));
  assert.equal(ids.size, 3683);
});

test('2. Preserved categories match authoritative master totals (episodes and visits)', () => {
  const counts = { TINGGI_SIM: 0, SEDANG_SIM: 0, RENDAH_SIM: 0 };
  let totalVisits = 0;
  const visitCounts = { TINGGI_SIM: 0, SEDANG_SIM: 0, RENDAH_SIM: 0 };

  for (const ep of episodes) {
    counts[ep.cat as keyof typeof counts]++;
    visitCounts[ep.cat as keyof typeof visitCounts] += ep.visitCount;
    totalVisits += ep.visitCount;
  }

  assert.deepEqual(counts, {
    TINGGI_SIM: 364,
    SEDANG_SIM: 23,
    RENDAH_SIM: 3296,
  });

  assert.deepEqual(visitCounts, {
    TINGGI_SIM: 926,
    SEDANG_SIM: 49,
    RENDAH_SIM: 9801,
  });

  assert.equal(totalVisits, 10776);
});

test('3. Reference facilities catalogue contains exactly 879 records with valid coordinates', () => {
  assert.equal(facilities.features.length, 879);
  assert.equal(summary.totals.facilitiesReference, 879);

  for (const f of facilities.features) {
    const [lon, lat] = (f as any).geometry.coordinates;
    assert.ok(typeof lon === 'number' && !isNaN(lon), `Invalid lon for ${f.properties.id}`);
    assert.ok(typeof lat === 'number' && !isNaN(lat), `Invalid lat for ${f.properties.id}`);
    assert.ok(lon >= 118.0 && lon <= 126.0, `Lon out of bounds for ${f.properties.id}: ${lon}`);
    assert.ok(lat >= -12.0 && lat <= -7.5, `Lat out of bounds for ${f.properties.id}: ${lat}`);
  }
});

test('4. Master origin and destination facilities are reconciled against reference', () => {
  const refIds = new Set(facilities.features.map((f: any) => f.properties.id));
  const origIds = new Set(episodes.map((e) => e.fromId));
  const destIds = new Set(episodes.map((e) => e.toId));

  assert.equal(origIds.size, 185, 'Expected 185 unique origin facilities');
  assert.equal(destIds.size, 387, 'Expected 387 unique destination facilities');

  // Verify all are in reference
  for (const id of origIds) {
    assert.ok(refIds.has(id), `Origin ${id} not found in reference`);
  }
  for (const id of destIds) {
    assert.ok(refIds.has(id), `Destination ${id} not found in reference`);
  }
});

test('5. Exactly 16 images join to exactly 8 distinct episodes (2 per episode)', () => {
  assert.equal(geoai.images.length, 16);
  assert.equal(geoai.count, 16);

  const episodeToImages = new Map<string, typeof geoai.images>();
  for (const img of geoai.images) {
    const epId = String(img.episode);
    if (!episodeToImages.has(epId)) {
      episodeToImages.set(epId, []);
    }
    episodeToImages.get(epId)!.push(img);
  }

  // Exactly 8 distinct episodes
  assert.equal(episodeToImages.size, 8);

  // Each episode has exactly 2 scenarios (A and B)
  for (const [epId, imgs] of episodeToImages.entries()) {
    assert.equal(imgs.length, 2, `Episode ${epId} does not have 2 images`);
    const scenarios = imgs.map((i) => i.scenario).sort();
    assert.deepEqual(scenarios, ['A', 'B'], `Episode ${epId} scenarios mismatch`);

    // Verify episode exists in master and is TINGGI_SIM
    const ep = episodes.find((e) => String(e.id) === epId);
    assert.ok(ep, `GeoAI episode ${epId} not found in master`);
    assert.equal(ep!.cat, 'TINGGI_SIM', `GeoAI episode ${epId} is not TINGGI_SIM`);
    assert.equal(ep!.hasGeoAI, true);
  }
});

test('6. Ten episodes with nearest alternative outside NTT are correctly flagged', () => {
  const outsideAltEpisodes = episodes.filter((e) => e.altOutside);
  assert.equal(outsideAltEpisodes.length, 10);
  assert.equal(summary.totals.outsideAltEpisodes, 10);

  const refIds = new Set(facilities.features.map((f: any) => f.properties.id));
  for (const ep of outsideAltEpisodes) {
    assert.ok(ep.altId, 'Outside alt episode missing altId');
    assert.ok(!refIds.has(ep.altId!), `Alt ${ep.altId} unexpectedly found in NTT reference`);
  }
});

test('7. Geographic boundaries cover the full NTT province and 21 districts', () => {
  assert.equal(boundary.features.length, 1);
  assert.equal(districts.features.length, 21);

  const distNames = districts.features.map((f: any) => f.properties.name).sort();
  assert.ok(distNames.includes('Sikka'));
  assert.ok(distNames.includes('Kupang'));
  assert.ok(distNames.includes('Manggarai'));
  assert.ok(distNames.includes('TimorTengahSelatan'));
  assert.ok(distNames.includes('Belu'));
  assert.ok(distNames.includes('Ende'));
  assert.ok(distNames.includes('FloresTimur'));
});

test('8. All 16 PNG images, 16 thumbnails, 16 overlays, and 8 latar exist on disk', () => {
  const baseDir = path.resolve(__dirname, '..', 'public', 'geoai', 'ntt', 'v2');

  for (const img of geoai.images) {
    const fullImgPath = path.join(baseDir, img.image.replace('/geoai/ntt/v2/', ''));
    const thumbPath = path.join(baseDir, img.thumbnail.replace('/geoai/ntt/v2/', ''));
    const overlayPath = path.join(baseDir, img.overlay.replace('/geoai/ntt/v2/', ''));
    const latarPath = path.join(baseDir, img.latar.replace('/geoai/ntt/v2/', ''));

    assert.ok(fs.existsSync(fullImgPath), `Full image missing: ${fullImgPath}`);
    assert.ok(fs.existsSync(thumbPath), `Thumbnail missing: ${thumbPath}`);
    assert.ok(fs.existsSync(overlayPath), `Overlay missing: ${overlayPath}`);
    assert.ok(fs.existsSync(latarPath), `Latar missing: ${latarPath}`);
  }
});
