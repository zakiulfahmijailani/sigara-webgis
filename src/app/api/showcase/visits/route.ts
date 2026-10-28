import { NextResponse } from 'next/server';
import { database, DATASET_ID, API_CACHE } from '@/lib/server/ntt-neon';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const episodeId = new URL(request.url).searchParams.get('episodeId');
  if (!episodeId || episodeId.length > 128) {
    return NextResponse.json({ error: 'Parameter episodeId diperlukan dan harus valid' }, { status: 400 });
  }
  try {
    const sql = database();
    const rows = await sql`
      SELECT v.payload FROM sigara.ntt_visits v
      JOIN sigara.ntt_datasets d ON d.id=v.dataset_id AND d.status='ready'
      WHERE v.dataset_id=${DATASET_ID} AND v.episode_id=${episodeId} ORDER BY v.sequence
    `;
    const visits = rows.map(row => row.payload);
    return NextResponse.json({ episodeId, count: visits.length, visits, source: 'neon' }, { headers: API_CACHE });
  } catch {
    return NextResponse.json({ error: 'Kunjungan belum dapat dimuat. Silakan coba lagi.' }, {
      status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' },
    });
  }
}
