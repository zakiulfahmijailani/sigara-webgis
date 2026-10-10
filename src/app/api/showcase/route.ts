import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import snapshot from '@/data/showcase.json';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL, { fetchOptions: { signal: AbortSignal.timeout(5000) } });
      const [snapshotRows, uniqueRows] = await Promise.all([
        sql`SELECT payload FROM sigara.showcase_snapshots WHERE id = 'kupang-showcase-v1'`,
        sql`SELECT * FROM sigara.showcase_unique_referrals`.catch(() => []),
      ]);
      const data = snapshotRows[0]?.payload;
      if (data?.metadata?.version === snapshot.metadata.version && Array.isArray(data.cases) && data.cases.length === 1080) {
        const uniqueReferralIds = uniqueRows.length > 0
          ? uniqueRows.map((r: any) => String(r.id || r.rujukan_id || r.referral_id || Object.values(r)[0])).filter(Boolean)
          : undefined;
        return NextResponse.json(
          { data: { ...data, uniqueReferralIds }, source: 'neon' },
          { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
        );
      }
    } catch { console.warn('Showcase database unavailable; serving the versioned demo snapshot.'); }
  }
  return NextResponse.json({ data: snapshot, source: 'snapshot' }, { headers: { 'Cache-Control': 'public, s-maxage=60' } });
}
