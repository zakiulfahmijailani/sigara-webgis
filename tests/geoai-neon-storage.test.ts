import test from 'node:test';
import assert from 'node:assert/strict';
import { GEOAI_STORAGE, getNeonGeoAIImagePath } from '../src/lib/geoai-storage';
import { readNeonGeoAIImage } from '../src/lib/server/geoai-neon-storage';

const asset = GEOAI_STORAGE.assets[0];
const request = () => new Request(`https://example.test${getNeonGeoAIImagePath(asset.fileName)}`);

test('Neon registry covers 16 immutable PNG objects with versioned app URLs', () => {
  assert.equal(GEOAI_STORAGE.assets.length, 16);
  assert.equal(new Set(GEOAI_STORAGE.assets.map(a => a.objectKey)).size, 16);
  for (const a of GEOAI_STORAGE.assets) {
    assert.match(a.sha256, /^[a-f0-9]{64}$/);
    assert.ok(a.objectKey.includes(a.sha256));
    assert.ok(a.bytes > 10000);
    assert.equal(new URL(getNeonGeoAIImagePath(a.fileName), 'https://example.test').searchParams.get('v'), a.sha256.slice(0, 16));
  }
});

test('Unknown file, traversal, and mismatched version never fetch arbitrary URLs', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw Error('Unexpected fetch'); };
  try {
    for (const file of ['missing.png', '../secret', 'https://example.test/x']) {
      assert.equal((await readNeonGeoAIImage(request(), file)).status, 404);
    }
    assert.equal((await readNeonGeoAIImage(new Request('https://example.test/x?v=wrong'), asset.fileName)).status, 404);
  } finally { globalThis.fetch = original; }
});

test('Image handler streams Neon bytes and supports HEAD and conditional cached reads', async () => {
  const original = globalThis.fetch;
  const originalEndpoint = process.env.NEON_GEOAI_STORAGE_ENDPOINT;
  delete process.env.NEON_GEOAI_STORAGE_ENDPOINT;
  let calls = 0;
  const bytes = new Uint8Array(asset.bytes);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(new URL(String(url)).hostname, new URL(GEOAI_STORAGE.endpoint).hostname);
    assert.ok(String(url).endsWith(asset.objectKey));
    assert.equal(options?.cache, 'no-store');
    return new Response(options?.method === 'HEAD' ? null : bytes, {
      headers: { 'Content-Type': 'image/png', 'Content-Length': String(asset.bytes) },
    });
  };
  try {
    const response = await readNeonGeoAIImage(request(), asset.fileName);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('X-Content-Source'), 'neon-object-storage');
    assert.match(response.headers.get('Cache-Control')!, /s-maxage=31536000/);
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
    const head = await readNeonGeoAIImage(request(), asset.fileName, 'HEAD');
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    const before = calls;
    const conditional = request();
    conditional.headers.set('If-None-Match', response.headers.get('ETag')!);
    assert.equal((await readNeonGeoAIImage(conditional, asset.fileName)).status, 304);
    assert.equal(calls, before);
  } finally {
    globalThis.fetch = original;
    if (originalEndpoint === undefined) delete process.env.NEON_GEOAI_STORAGE_ENDPOINT;
    else process.env.NEON_GEOAI_STORAGE_ENDPOINT = originalEndpoint;
  }
});

test('Storage outage or wrong response returns retryable failure without local fallback', async () => {
  const original = globalThis.fetch;
  try {
    for (const fetcher of [
      async () => { throw Error('Storage unavailable'); },
      async () => new Response('missing', { status: 404 }),
      async () => new Response('<html>unexpected</html>', { headers: { 'Content-Type': 'text/html' } }),
    ]) {
      globalThis.fetch = fetcher;
      const response = await readNeonGeoAIImage(request(), asset.fileName);
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.equal(response.headers.get('Retry-After'), '5');
      assert.equal((await response.json()).imageUrl, undefined);
    }
  } finally { globalThis.fetch = original; }
});
