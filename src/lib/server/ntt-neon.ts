import { neon } from '@neondatabase/serverless';
import type { ShowcaseData, Episode } from '../showcase';

export const DATASET_ID = 'ntt-showcase-v2';
export function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Database unavailable');
  return neon(url, { fetchOptions: { signal: AbortSignal.timeout(15_000) } });
}

export async function readShowcase(episodeId?: string): Promise<ShowcaseData | null> {
  const sql = database();
  if (episodeId !== undefined) {
    const rows = await sql`
      SELECT s.payload - 'episodes' AS context,e.payload AS episode
      FROM sigara.showcase_snapshots s
      JOIN sigara.ntt_datasets d ON d.id=s.id AND d.status='ready'
      JOIN sigara.ntt_episodes e ON e.dataset_id=d.id AND e.id=${episodeId}
      WHERE s.id=${DATASET_ID}
    `;
    if (!rows.length) return null;
    return { ...rows[0].context, episodes: [rows[0].episode as Episode] } as ShowcaseData;
  }
  const rows = await sql`
    SELECT s.payload FROM sigara.showcase_snapshots s
    JOIN sigara.ntt_datasets d ON d.id=s.id AND d.status='ready'
    WHERE s.id=${DATASET_ID}
  `;
  const data = rows[0]?.payload as ShowcaseData | undefined;
  if (!data || data.summary?.version !== DATASET_ID || data.episodes?.length !== data.summary?.totals.episodes) throw new Error('Dataset unavailable');
  return data;
}
export const API_CACHE = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' };
