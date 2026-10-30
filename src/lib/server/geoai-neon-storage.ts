import { GEOAI_STORAGE, getStoredGeoAIAsset } from '../geoai-storage';

const cached = 'public, max-age=86400, s-maxage=31536000, immutable';
const fail = (status: number) => Response.json(
  { error: status === 404 ? 'Gambar tidak ditemukan' : 'Gambar dari Neon belum dapat dimuat. Coba lagi.' },
  { status, headers: { 'Cache-Control': 'no-store', ...(status === 503 ? { 'Retry-After': '5' } : {}) } },
);

export async function readNeonGeoAIImage(request: Request, fileName: string, method: 'GET' | 'HEAD' = 'GET') {
  const asset = getStoredGeoAIAsset(fileName);
  if (!asset) return fail(404);
  const version = new URL(request.url).searchParams.get('v');
  if (version && version !== asset.sha256.slice(0, 16)) return fail(404);

  const etag = `"${asset.sha256}"`;
  const headers = new Headers({
    'Cache-Control': cached,
    ETag: etag,
    'Content-Type': asset.contentType,
    'Content-Length': String(asset.bytes),
    'X-Content-Type-Options': 'nosniff',
    'X-Content-Source': 'neon-object-storage',
  });
  const condition = request.headers.get('If-None-Match');
  if (condition?.split(',').some(tag => tag.trim() === '*' || tag.trim().replace(/^W\//, '') === etag)) {
    headers.delete('Content-Length');
    return new Response(null, { status: 304, headers });
  }

  try {
    const endpoint = new URL(process.env.NEON_GEOAI_STORAGE_ENDPOINT || GEOAI_STORAGE.endpoint);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== '/' ||
      !/^br-[a-z0-9-]+\.storage\.c-\d+\.[a-z0-9-]+\.aws\.neon\.tech$/.test(endpoint.hostname)) {
      return fail(503);
    }
    const url = new URL(`${GEOAI_STORAGE.bucket}/${asset.objectKey}`, endpoint);
    const upstream = await fetch(url, {
      method,
      cache: 'no-store', // Large PNGs bypass Next's small fetch cache; the response uses CDN caching.
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
    });
    if (!upstream.ok || upstream.headers.get('Content-Type')?.split(';')[0].trim() !== asset.contentType ||
      (upstream.headers.has('Content-Length') && Number(upstream.headers.get('Content-Length')) !== asset.bytes)) {
      await upstream.body?.cancel();
      return fail(503);
    }
    if (method === 'GET' && !upstream.body) return fail(503);
    return new Response(method === 'HEAD' ? null : upstream.body, { status: 200, headers });
  } catch {
    // No signed URL, credential, or local-static fallback is returned to the client.
    return fail(503);
  }
}
