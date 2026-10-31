import test from 'node:test';
import assert from 'node:assert/strict';
import facilities from '../src/data/ntt-facilities.json';
import episodes from '../src/data/ntt-episodes.json';
import visits from '../src/data/ntt-visits.json';
import geoai from '../src/data/ntt-geoai-manifest.json';

const names = new Map(facilities.features.map(f => [f.properties.id, f.properties.nama]));
const complete = (name: string | null) => name?.trim() && !/tanpa nama|belum tersedia|^REF-|^(Klinik|Puskesmas|Rumah Sakit|RS)$/i.test(name);

test('every map facility has a complete name, including the reported destination', () => {
  for (const name of names.values()) assert.ok(complete(name), name);
  assert.match(names.get('REF-1f0698cfd40449')!, /^RS Harapan Manggarai Barat .*\(Simulasi\)$/);
});

test('all episode, visit and GeoAI names match their facility IDs', () => {
  const altNames = new Map<string,string>();
  for (const ep of episodes) {
    assert.equal(ep.fromName, names.get(ep.fromId), ep.id);
    assert.equal(ep.toName, names.get(ep.toId), ep.id);
    if (ep.altId) {
      assert.ok(complete(ep.altName), ep.id);
      const prior = names.get(ep.altId) ?? altNames.get(ep.altId);
      if (prior) assert.equal(ep.altName, prior, ep.id);
      altNames.set(ep.altId, ep.altName!);
    }
  }
  for (const list of Object.values(visits)) for (const v of list) {
    assert.equal(v.fromName, names.get(v.fromId), v.visitId);
    assert.equal(v.toName, names.get(v.toId), v.visitId);
  }
  for (const c of geoai.cases) {
    assert.equal(c.facilityNames.asal, names.get(c.facilityIds.asal));
    assert.equal(c.facilityNames.tujuan, names.get(c.facilityIds.tujuan));
  }
});
