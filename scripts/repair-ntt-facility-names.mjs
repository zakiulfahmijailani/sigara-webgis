// Test on a Neon child branch first, then repeat against production.
// node --env-file=<ignored-branch-env> scripts/repair-ntt-facility-names.mjs
import { readFile } from 'node:fs/promises';
const { neon } = await import(process.env.SIGARA_NEON_MODULE || '@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
const sources = await Promise.all(['003-ntt-facility-names.sql','004-ntt-facility-display-names.sql']
  .map(file => readFile(new URL('./migrations/'+file,import.meta.url),'utf8')));
const statements = sources.flatMap(source => source.split('-- statement-break').slice(1).map(s => s.trim()).filter(Boolean));
await sql.transaction(statements.map(statement => sql.query(statement)));
console.log('Facility names synchronized and validated in one transaction.');
