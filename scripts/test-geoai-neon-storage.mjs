import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const manifest = JSON.parse(await readFile(resolve('src/data/ntt-geoai-storage.json'), 'utf8'));
const base = process.env.SIGARA_TEST_URL || 'http://127.0.0.1:3111';
const records = [];
for (const asset of manifest.assets) {
  const url = `${base}/api/geoai/evidence/${encodeURIComponent(asset.fileName)}?v=${asset.sha256.slice(0, 16)}`;
  const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200, asset.fileName);
  assert.equal(response.headers.get('X-Content-Source'), 'neon-object-storage');
  assert.equal(response.headers.get('Content-Type'), asset.contentType);
  assert.equal(Number(response.headers.get('Content-Length')), asset.bytes);
  assert.equal(response.headers.get('ETag'), `"${asset.sha256}"`);
  assert.match(response.headers.get('Cache-Control') || '', /s-maxage=31536000/);
  records.push({ fileName: asset.fileName, bytes: asset.bytes, headStatus: response.status });
}
const sample = manifest.assets[0];
const sampleUrl = `${base}/api/geoai/evidence/${sample.fileName}?v=${sample.sha256.slice(0, 16)}`;
const response = await fetch(sampleUrl, { signal: AbortSignal.timeout(30_000) });
assert.equal(response.status, 200);
const bytes = new Uint8Array(await response.arrayBuffer());
assert.equal(createHash('sha256').update(bytes).digest('hex'), sample.sha256);
const conditional = await fetch(sampleUrl, { headers: { 'If-None-Match': `"${sample.sha256}"` } });
assert.equal(conditional.status, 304);
const missing = await fetch(`${base}/api/geoai/evidence/unknown.png`);
assert.equal(missing.status, 404);

const report = {
  provider: manifest.provider, projectId: manifest.projectId, branchId: manifest.branchId,
  bucket: manifest.bucket, files: records.length, totalPngBytes: records.reduce((n, r) => n + r.bytes, 0),
  sampleSha256Verified: true, conditionalStatus: conditional.status, missingStatus: missing.status, records,
};
if (process.env.SIGARA_REPORT) {
  const target = resolve(process.env.SIGARA_REPORT);
  await mkdir(resolve(target, '..'), { recursive: true });
  await writeFile(target, JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report));
