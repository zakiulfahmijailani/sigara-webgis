import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import snapshot from '@/data/showcase.json';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL, { fetchOptions: { signal: AbortSignal.timeout(5000) } });
      const snapshotRows = await sql`SELECT payload FROM sigara.showcase_snapshots WHERE id = 'kupang-showcase-v1'`;
      const data = snapshotRows[0]?.payload;

      if (data?.metadata?.version === snapshot.metadata.version && Array.isArray(data.cases) && data.cases.length === 1080) {
        // Query sigara.showcase_unique_referrals if available for validation
        let uniqueReferralIds: string[] | undefined;
        try {
          const uniqueRows = await sql`SELECT * FROM sigara.showcase_unique_referrals`;
          if (Array.isArray(uniqueRows) && uniqueRows.length > 0) {
            uniqueReferralIds = uniqueRows
              .map((r: any) => String(r.id || r.rujukan_id || r.referral_id || Object.values(r)[0]))
              .filter(Boolean);
          }
        } catch (viewErr: any) {
          console.warn('[SIGARA API] Notice: sigara.showcase_unique_referrals view query notice:', viewErr?.message || 'view unavailable');
        }

        return NextResponse.json(
          { data: { ...data, uniqueReferralIds }, source: 'neon' },
          { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
        );
      } else {
        console.warn('[SIGARA API] Neon snapshot payload version mismatch or incomplete case count; falling back to local snapshot.');
      }
    } catch (dbErr: any) {
      console.warn('[SIGARA API] Neon database query error; falling back to local snapshot:', dbErr?.message || 'Unknown DB error');
    }
  }
  return NextResponse.json({ data: snapshot, source: 'snapshot' }, { headers: { 'Cache-Control': 'public, s-maxage=60' } });
}
