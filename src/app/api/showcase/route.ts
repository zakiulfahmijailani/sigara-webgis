import { NextResponse } from 'next/server';
import { readShowcase, API_CACHE } from '@/lib/server/ntt-neon';
import { encodeShowcase } from '@/lib/showcase-wire';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const episodeId = params.get('episodeId') ?? undefined;
    if (episodeId !== undefined && (!episodeId || episodeId.length > 128)) {
      return NextResponse.json({ error: 'ID episode tidak valid' }, { status: 400 });
    }
    const data = await readShowcase(episodeId);
    if (!data) return NextResponse.json({ error: 'Episode tidak ditemukan' }, { status: 404 });
    const payload = params.get('compact') === '1' ? encodeShowcase(data) : { data };
    return NextResponse.json({ ...payload, source: 'neon' }, { headers: API_CACHE });
  } catch {
    // A failed database connection must not silently serve repository data.
    return NextResponse.json({ error: 'Data belum dapat dimuat. Silakan coba lagi.' }, {
      status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' },
    });
  }
}
