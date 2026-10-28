// node --env-file=.env.neon-test scripts/import-ntt-neon.mjs
// Run the same migration against production only after the test-branch checks pass.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const { neon } = await import(process.env.SIGARA_NEON_MODULE || '@neondatabase/serverless');

const root = resolve(process.cwd(), '..');
const input = resolve(root, 'output/neon_ntt_import_2026-10-28');
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).hostname.endsWith('.neon.tech')) throw Error('Configure a Neon DATABASE_URL in an ignored environment file.');
const sql = neon(databaseUrl, { fetchOptions: { signal: AbortSignal.timeout(120_000) } });
const id = 'ntt-showcase-v2';
const readJson = async name => JSON.parse(await readFile(resolve('src/data', name), 'utf8'));
const [summary, boundary, districts, facilities, episodes, geoai, visits, master] = await Promise.all([
  ...['ntt-summary.json','ntt-boundary.json','ntt-districts.json','ntt-facilities.json','ntt-episodes.json','ntt-geoai-manifest.json','ntt-visits.json'].map(readJson),
  readFile(resolve(input,'master-manifest.json'),'utf8').then(JSON.parse),
]);
assert.equal(master.sha256, summary.masterSha256);
assert.equal(master.rows, summary.totals.visits);
assert.equal(episodes.length, summary.totals.episodes);
const visitRows = Object.entries(visits).flatMap(([episodeId, list]) => list.map((payload, sequence) => ({episodeId,sequence,payload})));
assert.equal(visitRows.length, summary.totals.visits);
assert.equal(facilities.features.length, summary.totals.facilitiesReference);
const identity = (await sql`SELECT current_database() AS database,current_user AS role`)[0];
console.log(JSON.stringify({stage:'connected',...identity,scope:summary.scope}));
const migration = await readFile(resolve('scripts/migrations/001-ntt-neon.sql'),'utf8');
// This migration contains no procedural blocks; semicolons are statement delimiters.
for (const statement of migration.split(';').map(s=>s.trim()).filter(Boolean)) await sql.query(statement);
const prior = await sql`SELECT status,manifest FROM sigara.ntt_datasets WHERE id=${id}`;
if (prior[0]?.status === 'ready') {
  assert.equal(prior[0].manifest.sha256,master.sha256,'Refusing to replace a published dataset with a different source');
  console.log('Dataset already ready with matching source hash; no data overwritten.');
  process.exit(0);
}
await sql`INSERT INTO sigara.ntt_datasets(id,status,manifest) VALUES(${id},'loading',${JSON.stringify(master)}::jsonb) ON CONFLICT(id) DO UPDATE SET status='loading',manifest=EXCLUDED.manifest,updated_at=now()`;
for (const [key,payload] of Object.entries({summary,boundary,districts,geoai})) {
  await sql`INSERT INTO sigara.ntt_resources(dataset_id,key,payload) VALUES(${id},${key},${JSON.stringify(payload)}::jsonb) ON CONFLICT(dataset_id,key) DO UPDATE SET payload=EXCLUDED.payload`;
}
async function batches(items, statement, label, size=150) {
  for(let i=0;i<items.length;i+=size) {
    await sql.query(statement,[id,JSON.stringify(items.slice(i,i+size))]);
    if(i%1500===0) console.log(`${label}: ${Math.min(i+size,items.length)}/${items.length}`);
  }
}
await batches(episodes,`INSERT INTO sigara.ntt_episodes(dataset_id,id,category,from_id,to_id,district,month,has_geoai,payload)
 SELECT $1,j->>'id',j->>'cat',j->>'fromId',j->>'toId',j->>'kabAsal',j->>'month',(j->>'hasGeoAI')::boolean,j FROM jsonb_array_elements($2::jsonb) j
 ON CONFLICT(dataset_id,id) DO UPDATE SET category=EXCLUDED.category,from_id=EXCLUDED.from_id,to_id=EXCLUDED.to_id,district=EXCLUDED.district,month=EXCLUDED.month,has_geoai=EXCLUDED.has_geoai,payload=EXCLUDED.payload`,'episodes');
await batches(visitRows,`INSERT INTO sigara.ntt_visits(dataset_id,episode_id,sequence,visit_id,payload)
 SELECT $1,j->>'episodeId',(j->>'sequence')::integer,j->'payload'->>'visitId',j->'payload' FROM jsonb_array_elements($2::jsonb) j
 ON CONFLICT(dataset_id,episode_id,sequence) DO UPDATE SET visit_id=EXCLUDED.visit_id,payload=EXCLUDED.payload`,'visits');
await batches(facilities.features,`INSERT INTO sigara.ntt_facilities(dataset_id,id,payload)
 SELECT $1,j->'properties'->>'id',j FROM jsonb_array_elements($2::jsonb) j
 ON CONFLICT(dataset_id,id) DO UPDATE SET payload=EXCLUDED.payload`,'facilities');
const masterStatement=`INSERT INTO sigara.ntt_master_rujukan(dataset_id,row_number,episode_id,visit_id,payload)
 SELECT $1,(j->>'rowNumber')::integer,j->'payload'->>'id_kelompok_rujukan_fktp',j->'payload'->>'id_kunjungan_fkrtl',j->'payload' FROM jsonb_array_elements($2::jsonb) j
 ON CONFLICT(dataset_id,row_number) DO UPDATE SET episode_id=EXCLUDED.episode_id,visit_id=EXCLUDED.visit_id,payload=EXCLUDED.payload`;
let buffer=[],rowNumber=0;
for await (const line of createInterface({input:createReadStream(resolve(input,'master.ndjson')),crlfDelay:Infinity})) {
  if(!line.trim())continue;
  buffer.push({rowNumber:++rowNumber,payload:JSON.parse(line)});
  if(buffer.length===100) { await sql.query(masterStatement,[id,JSON.stringify(buffer)]);buffer=[];if(rowNumber%1000===0)console.log(`master: ${rowNumber}/${master.rows}`); }
}
if(buffer.length)await sql.query(masterStatement,[id,JSON.stringify(buffer)]);
assert.equal(rowNumber,master.rows);
const sourceBytes=await readFile(master.source);
assert.equal(createHash('sha256').update(sourceBytes).digest('hex'),master.sha256);
await sql`INSERT INTO sigara.ntt_source_files(dataset_id,filename,sha256,content) VALUES(${id},${master.filename},${master.sha256},decode(${sourceBytes.toString('hex')},'hex')) ON CONFLICT(dataset_id,filename) DO UPDATE SET sha256=EXCLUDED.sha256,content=EXCLUDED.content`;
const counts=(await sql`SELECT (SELECT count(*)::int FROM sigara.ntt_episodes WHERE dataset_id=${id}) episodes,(SELECT count(*)::int FROM sigara.ntt_visits WHERE dataset_id=${id}) visits,(SELECT count(*)::int FROM sigara.ntt_facilities WHERE dataset_id=${id}) facilities,(SELECT count(*)::int FROM sigara.ntt_master_rujukan WHERE dataset_id=${id}) master_rows,(SELECT count(DISTINCT payload->>'id_peserta_sumber')::int FROM sigara.ntt_master_rujukan WHERE dataset_id=${id}) participants`)[0];
assert.deepEqual(counts,{episodes:3683,visits:10776,facilities:879,master_rows:10776,participants:2329});
const categories=await sql`SELECT category,count(*)::int AS episodes,sum((payload->>'visitCount')::int)::int AS visits FROM sigara.ntt_episodes WHERE dataset_id=${id} GROUP BY category ORDER BY category`;
for(const row of categories) {assert.equal(row.episodes,summary.episodeCategories[row.category]);assert.equal(row.visits,summary.visitCategories[row.category]);}
const integrity=(await sql`SELECT (SELECT count(*)::int FROM sigara.ntt_master_rujukan m LEFT JOIN sigara.ntt_episodes e ON e.dataset_id=m.dataset_id AND e.id=m.episode_id WHERE m.dataset_id=${id} AND e.id IS NULL) orphan_master_rows,(SELECT count(*)::int FROM sigara.ntt_episodes e WHERE e.dataset_id=${id} AND (e.payload->>'visitCount')::int<>(SELECT count(*) FROM sigara.ntt_visits v WHERE v.dataset_id=e.dataset_id AND v.episode_id=e.id)) incorrect_visit_counts`)[0];
assert.deepEqual(integrity,{orphan_master_rows:0,incorrect_visit_counts:0});
const storedFile=(await sql`SELECT md5(content) AS md5,octet_length(content) AS bytes FROM sigara.ntt_source_files WHERE dataset_id=${id} AND filename=${master.filename}`)[0];
assert.equal(storedFile.md5,createHash('md5').update(sourceBytes).digest('hex'));
assert.equal(storedFile.bytes,sourceBytes.length);
// Check every episode/visit/facility value after round-trip, not only totals.
for(const [table,expected,key,select] of [
  ['ntt_episodes',episodes,x=>x.id,'id'],
  ['ntt_facilities',facilities.features,x=>x.properties.id,'id'],
]) {
  const actual=await sql.query(`SELECT ${select},payload FROM sigara.${table} WHERE dataset_id=$1`,[id]);
  const lookup=new Map(actual.map(r=>[r.id,r.payload]));
  for(const item of expected)assert.deepEqual(lookup.get(key(item)),item);
}
for(const episodeId of Object.keys(visits).filter((_,i)=>i%100===0)) {
  const actual=await sql`SELECT payload FROM sigara.ntt_visits WHERE dataset_id=${id} AND episode_id=${episodeId} ORDER BY sequence`;
  assert.deepEqual(actual.map(r=>r.payload),visits[episodeId]);
}
const snapshot={summary,boundary,districts,facilities,episodes,geoai};
// Publish the compatibility snapshot and ready marker atomically. The old Kupang snapshot remains intact.
await sql.transaction([
  sql`INSERT INTO sigara.showcase_snapshots(id,payload) VALUES(${id},${JSON.stringify(snapshot)}::jsonb) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()`,
  sql`UPDATE sigara.ntt_datasets SET status='ready',updated_at=now() WHERE id=${id}`,
  sql.query('GRANT USAGE ON SCHEMA sigara TO sigara_showcase_reader'),
  sql.query('GRANT SELECT ON sigara.ntt_datasets,sigara.ntt_resources,sigara.ntt_episodes,sigara.ntt_visits,sigara.ntt_facilities TO sigara_showcase_reader'),
]);
const size=(await sql`SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size`)[0];
const report={checkedAt:new Date().toISOString(),dataset:id,database:identity.database,branch:process.env.SIGARA_BRANCH_LABEL||'unspecified',counts,categories,integrity,sourceParquetSha256:master.sha256,sourceFileBytes:storedFile.bytes,sourceFileByteEqualityVerified:true,episodePayloadEqualityVerified:true,facilityPayloadEqualityVerified:true,visitSampleEpisodes:Math.ceil(Object.keys(visits).length/100),status:'ready',...size};
await mkdir(input,{recursive:true});
await writeFile(resolve(input,`verification-${process.env.SIGARA_BRANCH_LABEL||'database'}.json`),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
