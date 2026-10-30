import test from 'node:test';
import assert from 'node:assert/strict';

import episodes from '../src/data/ntt-episodes.json';
import geoai from '../src/data/ntt-geoai-manifest.json';
import demoConfig from '../src/data/sigara-index-demo.json';
import { DATA_SOURCES, PILLARS, VARIABLE_BLUEPRINTS } from '../src/lib/sigara-index-sources';
import {
  DEMO_WEIGHTS,
  calculateWeightedTotal,
  reconstructMasterScore,
  buildEpisodeExplanation,
} from '../src/lib/sigara-index';
import { buildSankeyGraph } from '../src/lib/sigara-index-graph';
import type { Episode, GeoAIManifest } from '../src/lib/showcase';

const typedEpisodes = episodes as unknown as Episode[];
const typedGeoAI = geoai as unknown as GeoAIManifest;

test('SIGARA-1: Delapan sumber data dan empat pilar terdefinisi tepat', () => {
  // Exactly 8 sources per brief §5
  assert.equal(DATA_SOURCES.length, 8);
  const expectedSourceIds = [
    'bpjs',
    'dummy',
    'satellite',
    'osm',
    'big',
    'kemkes',
    'bnpb',
    'bps',
  ];
  assert.deepEqual(DATA_SOURCES.map((s) => s.id), expectedSourceIds);

  // Exactly 4 pillars
  const pillarKeys = Object.keys(PILLARS);
  assert.equal(pillarKeys.length, 4);
  assert.deepEqual(pillarKeys.sort(), ['access', 'geoai', 'patterns', 'services'].sort());

  // Exactly 12 variable blueprints
  assert.equal(VARIABLE_BLUEPRINTS.length, 12);
});

test('SIGARA-2: Bobot demo model berjumlah tepat 1.0 (100%)', () => {
  const sum =
    DEMO_WEIGHTS.services +
    DEMO_WEIGHTS.patterns +
    DEMO_WEIGHTS.geoai +
    DEMO_WEIGHTS.access;
  assert.ok(Math.abs(sum - 1.0) < 1e-6, `Sum of weights should be 1.0, got ${sum}`);
  assert.equal(demoConfig.weights.services, 0.25);
  assert.equal(demoConfig.weights.patterns, 0.15);
  assert.equal(demoConfig.weights.geoai, 0.35);
  assert.equal(demoConfig.weights.access, 0.25);
});

test('SIGARA-3: Canonical math test: 80, 70, 40, 60 menghasilkan tepat 59.5', () => {
  const scores = demoConfig.canonicalMathTest.pillarScores;
  const result = calculateWeightedTotal(scores, DEMO_WEIGHTS);
  assert.equal(result.total, demoConfig.canonicalMathTest.expectedTotal);
  assert.equal(result.total, 59.5);

  // Breakdown contribution
  assert.equal(result.contributions.services, 20.0);
  assert.equal(result.contributions.patterns, 10.5);
  assert.equal(result.contributions.geoai, 14.0);
  assert.equal(result.contributions.access, 15.0);
});

test('SIGARA-4: Pilar tidak lengkap menghasilkan total null (bukan 0)', () => {
  const incompleteScores = {
    services: 80,
    patterns: 70,
    geoai: null,
    access: 60,
  };
  const result = calculateWeightedTotal(incompleteScores, DEMO_WEIGHTS);
  assert.equal(result.total, null);
  assert.equal(result.contributions.geoai, null);
  assert.equal(result.contributions.services, 20.0);
});

test('SIGARA-5: Rekonstruksi formula master untuk episode 192730424P000116 sesuai toleransi <= 0.2', () => {
  const ep = typedEpisodes.find((e) => String(e.id) === '192730424P000116');
  assert.ok(ep, 'Episode 192730424P000116 should exist');

  const recon = reconstructMasterScore(ep);
  assert.ok(ep.fraudIdx != null);
  assert.ok(Math.abs(recon.finalScore - ep.fraudIdx) <= 0.2, `Reconstructed ${recon.finalScore} should match master ${ep.fraudIdx}`);
  assert.equal(recon.maxScore, 90.0);
  assert.equal(recon.roundingTolerance, 'Sesuai dengan toleransi pembulatan');
});

test('SIGARA-6: fraudIdx pada Episode tidak pernah dimutasi oleh penjelas indeks', () => {
  const ep = typedEpisodes[0];
  const originalFraudIdx = ep.fraudIdx;

  const explMaster = buildEpisodeExplanation(ep, 'master', typedGeoAI);
  assert.equal(ep.fraudIdx, originalFraudIdx);

  const explDemo = buildEpisodeExplanation(ep, 'multipillar_demo', typedGeoAI);
  assert.equal(ep.fraudIdx, originalFraudIdx);
});

test('SIGARA-7: Status ketersediaan GeoAI jujur: hanya 8 episode percontohan yang memiliki bukti raster', () => {
  const geoaiEp = typedEpisodes.find((e) => e.hasGeoAI);
  assert.ok(geoaiEp, 'Should find at least one episode with hasGeoAI=true');

  const explWithGeoAI = buildEpisodeExplanation(geoaiEp, 'multipillar_demo', typedGeoAI);
  const geoaiPillar = explWithGeoAI.pillars.find((p) => p.id === 'geoai');
  assert.ok(geoaiPillar);
  assert.equal(geoaiPillar.availability, 'available');
  assert.notEqual(geoaiPillar.score, null);

  const nonGeoaiEp = typedEpisodes.find((e) => !e.hasGeoAI);
  assert.ok(nonGeoaiEp, 'Should find at least one episode with hasGeoAI=false');

  const explNoGeoAI = buildEpisodeExplanation(nonGeoaiEp, 'multipillar_demo', typedGeoAI);
  const geoaiPillarNone = explNoGeoAI.pillars.find((p) => p.id === 'geoai');
  assert.ok(geoaiPillarNone);
  assert.equal(geoaiPillarNone.availability, 'missing');
  assert.equal(geoaiPillarNone.score, null);
  // Total in multipillar demo should be null because GeoAI is missing
  assert.equal(explNoGeoAI.score, null);
});

test('SIGARA-8: Sankey graph generator menghasilkan struktur 8 sumber, 4 pilar, 1 indeks', () => {
  const graph = buildSankeyGraph(1000, 700);

  const sources = graph.nodes.filter((n) => n.kind === 'source');
  assert.equal(sources.length, 8);

  const pillars = graph.nodes.filter((n) => n.kind === 'pillar');
  assert.equal(pillars.length, 4);

  const indexes = graph.nodes.filter((n) => n.kind === 'index');
  assert.equal(indexes.length, 1);
  assert.equal(indexes[0].id, 'index');

  // Links exist between pillars and index (4 links)
  const pillarToIdxLinks = graph.links.filter((l) => l.targetId === 'index');
  assert.equal(pillarToIdxLinks.length, 4);

  // Source to pillar links
  const srcToPillarLinks = graph.links.filter((l) => l.targetId !== 'index');
  assert.ok(srcToPillarLinks.length >= 8);
});
