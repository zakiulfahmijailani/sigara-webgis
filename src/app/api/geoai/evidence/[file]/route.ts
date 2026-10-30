import { readNeonGeoAIImage } from '@/lib/server/geoai-neon-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ file: string }> };

export async function GET(request: Request, { params }: Context) {
  return readNeonGeoAIImage(request, (await params).file);
}

export async function HEAD(request: Request, { params }: Context) {
  return readNeonGeoAIImage(request, (await params).file, 'HEAD');
}
