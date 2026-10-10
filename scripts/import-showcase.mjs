import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL locally before importing.');
const data = JSON.parse(await readFile(new URL('../src/data/showcase.json', import.meta.url), 'utf8'));
const sql = neon(process.env.DATABASE_URL);
await sql.transaction([
  sql`CREATE SCHEMA IF NOT EXISTS sigara`,
  sql`CREATE TABLE IF NOT EXISTS sigara.showcase_snapshots (id text PRIMARY KEY, payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`,
  sql`INSERT INTO sigara.showcase_snapshots (id, payload) VALUES (${data.metadata.version}, ${JSON.stringify(data)}::jsonb) ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
]);
console.log(`Imported ${data.metadata.version}: ${data.cases.length} synthetic cases.`);
