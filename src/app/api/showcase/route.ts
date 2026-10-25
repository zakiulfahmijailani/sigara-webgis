import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import summary from '@/data/ntt-summary.json';
import boundary from '@/data/ntt-boundary.json';
import districts from '@/data/ntt-districts.json';
import facilities from '@/data/ntt-facilities.json';
import episodes from '@/data/ntt-episodes.json';
import geoai from '@/data/ntt-geoai-manifest.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL, {
        fetchOptions: { signal: AbortSignal.timeout(5000) },
      });
      const snapshotRows = await sql`
        SELECT payload FROM sigara.showcase_snapshots WHERE id = 'ntt-showcase-v2'
      `;
      const data = snapshotRows[0]?.payload;

      if (
        data?.summary?.version === 'ntt-showcase-v2' &&
        Array.isArray(data.episodes) &&
        data.episodes.length === 3683
      ) {
        return NextResponse.json(
          { data, source: 'neon' },
          {
            headers: {
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            },
          }
        );
      } else {
        console.warn(
          '[SIGARA API] Neon snapshot payload version mismatch or incomplete NTT case count; falling back to local snapshot.'
        );
      }
    } catch (dbErr: any) {
      console.warn(
        '[SIGARA API] Neon database query notice; falling back to local snapshot:',
        dbErr?.message || 'Unknown DB error'
      );
    }
  }

  // Fallback to local verified NTT snapshot
  const localData = {
    summary,
    boundary,
    districts,
    facilities,
    episodes,
    geoai,
  };

  return NextResponse.json(
    { data: localData, source: 'snapshot' },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    }
  );
}
