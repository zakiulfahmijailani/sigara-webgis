// Feed short-lived presigned upload tasks as JSON on stdin. Never log signed URLs.
// Every task: {filePath, fileName, sha256, bytes, upload:{url,method,headers}, downloadUrl}.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const tasks = JSON.parse(input.trim());
if (!Array.isArray(tasks) || tasks.length > 20) throw Error('Invalid upload task list');
const allowed = url => {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !/^br-[a-z0-9-]+\.storage\.c-\d+\.ap-southeast-1\.aws\.neon\.tech$/.test(parsed.hostname)) {
    throw Error('Unexpected storage host');
  }
  return parsed;
};
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
for (const task of tasks) {
  try {
    allowed(task.upload.url); allowed(task.downloadUrl);
    if (task.upload.method !== 'PUT') throw Error('Unexpected upload method');
    const bytes = await readFile(task.filePath);
    if (bytes.length !== task.bytes || digest(bytes) !== task.sha256) throw Error('Source integrity mismatch');
    // Content-addressed keys are immutable; a retry reuses a matching uploaded object.
    const prior = await fetch(task.downloadUrl, { signal: AbortSignal.timeout(120_000) });
    let matched = false;
    if (prior.ok) matched = digest(new Uint8Array(await prior.arrayBuffer())) === task.sha256;
    else if (prior.status !== 404) throw Error(`Storage preflight HTTP ${prior.status}`);
    if (!matched) {
      if (prior.ok) throw Error('Existing object has different content');
      const upload = await fetch(task.upload.url, {
        method: 'PUT', body: bytes,
        headers: { ...task.upload.headers, 'Cache-Control': 'public, max-age=31536000, immutable' },
        signal: AbortSignal.timeout(180_000),
      });
      if (!upload.ok) throw Error(`Upload HTTP ${upload.status}`);
      const verify = await fetch(task.downloadUrl, { signal: AbortSignal.timeout(120_000) });
      if (!verify.ok) throw Error(`Verification HTTP ${verify.status}`);
      const received = new Uint8Array(await verify.arrayBuffer());
      if (received.byteLength !== task.bytes || digest(received) !== task.sha256) throw Error('Remote integrity mismatch');
    }
    console.log(JSON.stringify({ file: task.fileName, bytes: task.bytes, sha256: task.sha256, verified: true, reused: matched }));
  } catch (error) {
    // The controlled errors above contain no credentials. Do not print fetch stacks/URLs.
    const message = error instanceof Error && /^(Source|Existing|Unexpected|Storage|Upload HTTP|Verification HTTP|Remote)/.test(error.message)
      ? error.message : 'Transfer failed; no credentials logged';
    console.error(JSON.stringify({ file: task.fileName, verified: false, error: message }));
    process.exitCode = 1;
    break;
  }
}
