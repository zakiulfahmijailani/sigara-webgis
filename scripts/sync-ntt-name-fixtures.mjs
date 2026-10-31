// Refresh serving fixtures after migration 003; credentials stay in the ignored env file.
// node --env-file=.env.neon-production scripts/sync-ntt-name-fixtures.mjs
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { neon } = await import(process.env.SIGARA_NEON_MODULE || '@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);
const id = 'ntt-showcase-v2';
const [{ payload: data }] = await sql`SELECT payload FROM sigara.showcase_snapshots WHERE id=${id}`;
const visits = await sql`SELECT episode_id,sequence,payload FROM sigara.ntt_visits WHERE dataset_id=${id} ORDER BY episode_id,sequence`;
const names = new Map(data.facilities.features.map(f => [f.properties.id, f.properties.nama]));
const complete = name => typeof name === 'string' && name.trim() && !/tanpa nama|belum tersedia|^REF-|^(Klinik|Puskesmas|Rumah Sakit|RS)$/i.test(name);
assert.equal(names.size, 879);
assert.equal(data.episodes.length, 3683);
assert.equal(visits.length, 10776);
for (const name of names.values()) assert.ok(complete(name), name);
for (const ep of data.episodes) {
  assert.equal(ep.fromName, names.get(ep.fromId));
  assert.equal(ep.toName, names.get(ep.toId));
  if (ep.altId) assert.ok(complete(ep.altName));
}
for (const { payload: v } of visits) {
  assert.equal(v.fromName, names.get(v.fromId));
  assert.equal(v.toName, names.get(v.toId));
}
// Keep the existing object/array ordering in fixtures for small, readable diffs.
const oldVisits = JSON.parse(await readFile('src/data/ntt-visits.json','utf8'));
const byEpisode = new Map();
for (const v of visits) {
  if (!byEpisode.has(v.episode_id)) byEpisode.set(v.episode_id, []);
  byEpisode.get(v.episode_id).push(v.payload);
}
for (const episodeId of Object.keys(oldVisits)) oldVisits[episodeId] = byEpisode.get(episodeId);
const files = {
  'ntt-facilities.json': data.facilities,
  'ntt-facilities.geojson': data.facilities,
  'ntt-episodes.json': data.episodes,
  'ntt-visits.json': oldVisits,
  'ntt-geoai-manifest.json': data.geoai,
};
function preserveKeyOrder(old, value) {
  if (Array.isArray(value)) return value.map((v, i) => preserveKeyOrder(old?.[i], v));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries([...new Set([...Object.keys(old ?? {}), ...Object.keys(value)])]
    .filter(k => k in value).map(k => [k, preserveKeyOrder(old?.[k], value[k])]));
}
for (const [file, value] of Object.entries(files)) {
  const path = 'src/data/' + file;
  const original = await readFile(path,'utf8');
  const indent = original.includes('\n  ') ? 2 : undefined;
  const normalized = preserveKeyOrder(JSON.parse(original), value);
  await writeFile(path, JSON.stringify(normalized,null,indent) + (original.endsWith('\n') ? '\n' : ''));
}
console.log(JSON.stringify({facilities: names.size, episodes: data.episodes.length, visits: visits.length, namesValidated: true}));
