import test from 'node:test';
import assert from 'node:assert/strict';
import summary from '../src/data/ntt-summary.json';
import episodes from '../src/data/ntt-episodes.json';
import boundary from '../src/data/ntt-boundary.json';
import districts from '../src/data/ntt-districts.json';
import facilities from '../src/data/ntt-facilities.json';
import geoai from '../src/data/ntt-geoai-manifest.json';
import type { ShowcaseData } from '../src/lib/showcase';
import { encodeShowcase, decodeShowcase } from '../src/lib/showcase-wire';

const data = { summary, episodes, boundary, districts, facilities, geoai } as unknown as ShowcaseData;
test('Compact transport preserves all episode values, nulls, opaque IDs and geometry', () => {
  const encoded = JSON.parse(JSON.stringify(encodeShowcase(data)));
  assert.deepEqual(decodeShowcase(encoded), data);
  assert.ok(JSON.stringify(encoded).length < JSON.stringify({ data }).length * 0.8);
});
test('Legacy response remains readable and malformed column rows cannot be accepted', () => {
  assert.deepEqual(decodeShowcase({ data }), data);
  assert.throws(() => decodeShowcase({ encoding:'unknown', data }));
  assert.throws(() => decodeShowcase({ encoding:'episode-columns-v1', data:{ ...data, episodes:[['partial']] } }));
});
