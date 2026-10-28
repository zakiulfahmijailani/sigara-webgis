import test from 'node:test';
import assert from 'node:assert/strict';
import rawEpisodes from '../src/data/ntt-episodes.json';
import type { Episode } from '../src/lib/showcase';
import {
  episodeCounts,
  filterMapEpisodes,
  originFeatures,
  journeyFeatures,
  endpointFeatures,
  readMapFilters,
  readCamera,
  investigationHref,
  investigationBackHref,
} from '../src/lib/map-overview';

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
  const original = new URLSearchParams('cat=orange&district=Sikka&month=2024-04&q=RS&list=1&page=2&origin=REF-123&line=REF-123__REF-456&lng=122.1&lat=-8.6&z=9.2');
  const detail = new URL(investigationHref('290411124Y000018', original), 'http://localhost');
  assert.equal(detail.pathname, '/episode/290411124Y000018');
  detail.searchParams.set('tab', 'evidence');
  assert.equal(investigationBackHref(detail.searchParams), `/?${original.toString()}`);
  assert.equal(investigationBackHref(new URLSearchParams('cat=red&tab=methods')), '/episode?cat=red');
  assert.equal(investigationBackHref(new URLSearchParams('from=https://example.org')), '/episode');
});

test('Malformed filter/camera URLs cannot put the map outside its supported region', () => {
  assert.equal(readMapFilters(new URLSearchParams('cat=invalid')).category, 'all');
  assert.equal(readMapFilters(new URLSearchParams('line=from1__to2')).line, 'from1__to2');
  for (const query of ['', 'lng=122&lat=-9', 'lng=NaN&lat=-9&z=7', 'lng=0&lat=0&z=7', 'lng=122&lat=-9&z=100']) {
    assert.equal(readCamera(new URLSearchParams(query)), null);
  }
  assert.deepEqual(readCamera(new URLSearchParams('lng=122&lat=-9&z=7')), { lng: 122, lat: -9, zoom: 7 });
});

test('Journey features accurately aggregate directed OD pairs, calculate category composition, and handle origin scoping', () => {
  const allJourneys = journeyFeatures(episodes);
  assert.equal(allJourneys.features.length, 1093);
  const totalEp = allJourneys.features.reduce((sum, f) => sum + f.properties.total, 0);
  assert.equal(totalEp, 3683);

  for (const f of allJourneys.features) {
    const p = f.properties;
    assert.equal(p.red + p.orange + p.green, p.total);
    assert.equal(p.episodeIds.length, p.total);
    assert.ok(p.lineWidth >= 2.6 && p.lineWidth <= 5.6);
    const coords = f.geometry.coordinates;
    assert.equal(coords.length, 2);
    assert.ok(Number.isFinite(coords[0][0]) && Number.isFinite(coords[0][1]));
    assert.ok(Number.isFinite(coords[1][0]) && Number.isFinite(coords[1][1]));
  }

  // Scoped to a specific origin
  const sampleOrigin = episodes[0].fromId;
  const scopedJourneys = journeyFeatures(episodes, sampleOrigin);
  const sampleEpisodes = episodes.filter(e => e.fromId === sampleOrigin);
  assert.equal(scopedJourneys.features.reduce((sum, f) => sum + f.properties.total, 0), sampleEpisodes.length);
  assert.ok(scopedJourneys.features.every(f => f.properties.fromId === sampleOrigin));

  // Endpoints extraction
  const endpoints = endpointFeatures(scopedJourneys);
  assert.ok(endpoints.features.some(f => f.properties.role === 'origin' && f.properties.id === sampleOrigin));
  assert.ok(endpoints.features.some(f => f.properties.role === 'destination'));
});

test('Journey features defensive coordinate validation skips invalid, null, zero, or equal coordinates', () => {
  const mockEpisodes: Episode[] = [
    {
      ...episodes[0],
      id: 'mock-valid',
      fromLon: 121.0,
      fromLat: -8.5,
      toLon: 122.0,
      toLat: -8.6,
    },
    {
      ...episodes[0],
      id: 'mock-null-origin',
      fromLon: null,
      fromLat: null,
      toLon: 122.0,
      toLat: -8.6,
    },
    {
      ...episodes[0],
      id: 'mock-zero-coords',
      fromLon: 0,
      fromLat: 0,
      toLon: 122.0,
      toLat: -8.6,
    },
    {
      ...episodes[0],
      id: 'mock-same-origin-dest',
      fromLon: 121.0,
      fromLat: -8.5,
      toLon: 121.0,
      toLat: -8.5,
    },
  ];

  const journeys = journeyFeatures(mockEpisodes);
  assert.equal(journeys.features.length, 1);
  assert.equal(journeys.features[0].properties.episodeIds[0], 'mock-valid');
});
