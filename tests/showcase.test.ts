import test from 'node:test';
import assert from 'node:assert/strict';
import raw from '../src/data/showcase.json';
import { assess, type ShowcaseData } from '../src/lib/showcase';
const data = raw as ShowcaseData;
test('the requested 25 / 52 / 1003 counts are computed from cases, not fixed badges', () => {
  const counts = { red: 0, orange: 0, green: 0 };
  data.cases.forEach(r => counts[assess(r, data).category]++);
  assert.deepEqual(counts, { red: 25, orange: 52, green: 1003 });
  assert.equal(new Set(data.cases.map(r => r.id)).size, 1080);
  assert.equal(data.cases.filter(r => r.showcaseAdjusted).length, 25);
});
test('every red scenario has real route comparisons and all three thresholds', () => {
  for (const r of data.cases.filter(r => assess(r, data).category === 'red')) {
    const a = assess(r, data);
    assert.ok(a.extra! >= 8 && a.ratio! >= 1.5 && a.alternatives.length >= 2);
    assert.equal(a.missing.length, 0);
    assert.equal(r.showcaseAdjusted, true);
    for (const x of a.alternatives) {
      assert.equal(data.capabilities[x.id][r.service], true);
      assert.equal(r.capacities[x.id], true);
      assert.ok(x.minutes < a.targetMinutes!);
    }
  }
});
const red = data.cases.find(r => assess(r, data).category === 'red')!;
test('missing capacity must become orange rather than being mistaken for a red finding', () => {
  const r = { ...red, capacities: { ...red.capacities, [red.to]: null } };
  assert.equal(assess(r, data).category, 'orange');
});
test('unavailable route and missing evidence block conclusions', () => {
  const routes = data.routes.filter(r => !(r.from === red.from && r.to === red.to));
  assert.equal(assess(red, { ...data, routes }).category, 'orange');
  assert.equal(assess({ ...red, evidence: false }, data).category, 'orange');
});
test('a documented reason is respected, but does not override incomplete data', () => {
  const r = { ...red, verified: true, reason: 'kontinuitas' };
  assert.equal(assess(r, data).status, 'Alasan terdokumentasi');
  assert.equal(assess({ ...r, evidence: false }, data).category, 'orange');
});
test('references and geometry are restricted to the city dataset', () => {
  const ids = new Set(data.facilities.map(f => f.id));
  assert.equal(ids.size, 10);
  assert.equal(ids.has('RS-S05'), false);
  assert.equal(ids.has('RS-S06'), false);
  for (const r of data.cases) {
    assert.ok(ids.has(r.from) && ids.has(r.to));
    assert.ok(Object.keys(r.capacities).every(id => ids.has(id)));
  }
  assert.equal(data.routes.length, 24);
  data.routes.forEach(r => { assert.ok(r.geometry?.coordinates.length! > 1); assert.ok(r.minutes! > 0); });
});
test('14 unique route representative cases are distinct and map to valid Dijkstra geometry', () => {
  const seen = new Set<string>();
  const representativeCases: typeof data.cases = [];
  for (const r of data.cases) {
    const routeKey = `${r.from}->${r.to}`;
    if (!seen.has(routeKey)) {
      seen.add(routeKey);
      representativeCases.push(r);
    }
  }
  assert.equal(representativeCases.length, 14);
  assert.equal(seen.size, 14);
  const routePairs = representativeCases.map(r => `${r.from}->${r.to}`);
  assert.equal(new Set(routePairs).size, 14);
  for (const r of representativeCases) {
    const route = data.routes.find(x => x.from === r.from && x.to === r.to);
    assert.ok(route, `Missing route for ${r.from}->${r.to}`);
    assert.ok(route.geometry && route.geometry.coordinates.length > 1, `Invalid geometry for ${r.from}->${r.to}`);
  }
});
test('25 red priority cases are preserved and grouped into 4 distinct geographic routes', () => {
  const redCases = data.cases.filter(r => assess(r, data).category === 'red');
  assert.equal(redCases.length, 25);

  const groups = new Map<string, typeof redCases>();
  for (const r of redCases) {
    const key = `${r.from} -> ${r.to}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  // Must have 4 distinct routes
  assert.equal(groups.size, 4);

  // Expected route counts based on verified synthetic showcase data
  assert.equal(groups.get('FKTP-S05 -> RS-S01')?.length, 9);
  assert.equal(groups.get('FKTP-S06 -> RS-S01')?.length, 8);
  assert.equal(groups.get('FKTP-S04 -> RS-S01')?.length, 7);
  assert.equal(groups.get('FKTP-S01 -> RS-S04')?.length, 1);

  // Sum of cases across all 4 groups must equal exactly 25
  const sum = Array.from(groups.values()).reduce((acc, cases) => acc + cases.length, 0);
  assert.equal(sum, 25);

  // Every group must have valid corresponding Dijkstra route geometry
  for (const [key, cases] of groups.entries()) {
    const [from, to] = key.split(' -> ');
    const route = data.routes.find(r => r.from === from && r.to === to);
    assert.ok(route, `Route not found for ${key}`);
    assert.ok(route.geometry && route.geometry.coordinates.length > 1, `Invalid geometry for ${key}`);
  }
});
test('all 1,080 cases remain distinct by id and accurately partitioned by category', () => {
  const allIds = new Set(data.cases.map(c => c.id));
  assert.equal(allIds.size, 1080);

  const counts = { red: 0, orange: 0, green: 0 };
  data.cases.forEach(r => counts[assess(r, data).category]++);
  assert.equal(counts.red, 25);
  assert.equal(counts.orange, 52);
  assert.equal(counts.green, 1003);
  assert.equal(counts.red + counts.orange + counts.green, 1080);
});
