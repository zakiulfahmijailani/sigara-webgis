import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as showcase } from '../src/app/api/showcase/route';
import { GET as visits } from '../src/app/api/showcase/visits/route';

test('Missing database returns retryable 503 without silently serving repository data', async () => {
  const original=process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    for (const [handler,path] of [[showcase,'/api/showcase'],[visits,'/api/showcase/visits?episodeId=290411124Y000018']] as const) {
      const response=await handler(new Request('https://example.test'+path));
      assert.equal(response.status,503);
      assert.equal(response.headers.get('Cache-Control'),'no-store');
      const payload=await response.json();
      assert.equal(payload.data,undefined);
      assert.equal(payload.source,undefined);
    }
  } finally { if(original===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=original; }
});
test('Missing or oversized episode IDs are rejected before database access', async () => {
  assert.equal((await visits(new Request('https://example.test/api/showcase/visits'))).status,400);
  assert.equal((await showcase(new Request('https://example.test/api/showcase?episodeId='))).status,400);
  assert.equal((await showcase(new Request('https://example.test/api/showcase?episodeId='+'x'.repeat(129)))).status,400);
});
