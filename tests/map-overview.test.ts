import test from 'node:test';
import assert from 'node:assert/strict';
import rawEpisodes from '../src/data/ntt-episodes.json';
import type { Episode } from '../src/lib/showcase';
import { episodeCounts, filterMapEpisodes, originFeatures, readMapFilters, readCamera, investigationHref, investigationBackHref } from '../src/lib/map-overview';

const episodes = rawEpisodes as Episode[];
test('Map overview preserves every category and aggregates episodes without losing shared origins', () => {
  const filters = readMapFilters(new URLSearchParams());
  const selected = filterMapEpisodes(episodes, filters);
  assert.deepEqual(episodeCounts(selected), { all: 3683, red: 364, orange: 23, green: 3296 });
  const groups = originFeatures(selected).features;
  assert.equal(groups.length, 185);
  assert.equal(groups.reduce((sum, f) => sum + f.properties.total, 0), 3683);
  for (const f of groups) {
    const p = f.properties;
    assert.equal(p.red + p.orange + p.green, p.total);
    assert.equal(p.total, episodes.filter(ep => ep.fromId === p.origin).length);
  }
});

test('Category filters, district, month and search have consistent list/map counts', () => {
  for (const [category, expected] of [['red', 364], ['orange', 23], ['green', 3296]] as const) {
    const f = readMapFilters(new URLSearchParams({ cat: category }));
    const filtered = filterMapEpisodes(episodes, f);
    assert.equal(filtered.length, expected);
    assert.equal(originFeatures(filtered).features.reduce((n, x) => n + x.properties.total, 0), expected);
  }
  const filters = readMapFilters(new URLSearchParams('district=Sikka&month=2024-11&cat=red'));
  assert.deepEqual(filterMapEpisodes(episodes, filters).map(e => e.id), episodes.filter(e => e.kabAsal === 'Sikka' && e.month === '2024-11' && e.cat === 'TINGGI_SIM').map(e => e.id));
  assert.equal(filterMapEpisodes(episodes, readMapFilters(new URLSearchParams('q=290411124Y000018')))[0].id, '290411124Y000018');
  assert.equal(filterMapEpisodes(episodes, readMapFilters(new URLSearchParams('q=no-such-episode'))).length, 0);
  assert.ok(filterMapEpisodes(episodes, readMapFilters(new URLSearchParams('q=Timor Tengah Selatan'))).length > 0);
});

test('GeoAI is an optional availability filter, never a changed risk category', () => {
  const selected = filterMapEpisodes(episodes, readMapFilters(new URLSearchParams('geoai=1')));
  assert.equal(selected.length, 8);
  assert.ok(selected.every(ep => ep.cat === 'TINGGI_SIM'));
  assert.equal(filterMapEpisodes(episodes, readMapFilters(new URLSearchParams('geoai=1&cat=green'))).length, 0);
});

test('Episode navigation round-trips the map context, preserves opaque IDs, and has a safe queue fallback', () => {
  const original = new URLSearchParams('cat=orange&district=Sikka&month=2024-04&q=RS&list=1&page=2&origin=REF-123&lng=122.1&lat=-8.6&z=9.2');
  const detail = new URL(investigationHref('290411124Y000018', original), 'http://localhost');
  assert.equal(detail.pathname, '/episode/290411124Y000018');
  detail.searchParams.set('tab', 'evidence');
  assert.equal(investigationBackHref(detail.searchParams), `/?${original.toString()}`);
  assert.equal(investigationBackHref(new URLSearchParams('cat=red&tab=methods')), '/episode?cat=red');
  assert.equal(investigationBackHref(new URLSearchParams('from=https://example.org')), '/episode');
});

test('Malformed filter/camera URLs cannot put the map outside its supported region', () => {
  assert.equal(readMapFilters(new URLSearchParams('cat=invalid')).category, 'all');
  for (const query of ['', 'lng=122&lat=-9', 'lng=NaN&lat=-9&z=7', 'lng=0&lat=0&z=7', 'lng=122&lat=-9&z=100']) {
    assert.equal(readCamera(new URLSearchParams(query)), null);
  }
  assert.deepEqual(readCamera(new URLSearchParams('lng=122&lat=-9&z=7')), { lng: 122, lat: -9, zoom: 7 });
});
