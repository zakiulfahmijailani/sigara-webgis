import { NextResponse } from 'next/server';
import visitsMap from '@/data/ntt-visits.json';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const episodeId = searchParams.get('episodeId');

  if (!episodeId) {
    return NextResponse.json(
      { error: 'Parameter episodeId diperlukan' },
      { status: 400 }
    );
  }

  const visits = (visitsMap as Record<string, any[]>)[episodeId] || [];

  return NextResponse.json(
    { episodeId, count: visits.length, visits },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  );
}
