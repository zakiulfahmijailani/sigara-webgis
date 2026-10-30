import manifest from '@/data/ntt-geoai-storage.json';

export const GEOAI_STORAGE = manifest;
const assets = new Map(manifest.assets.map(asset => [asset.fileName, asset]));

export function getStoredGeoAIAsset(fileName: string) {
  return assets.get(fileName) ?? null;
}

/** Versioned app URL is cached at the edge; bytes originate in Neon Object Storage. */
export function getNeonGeoAIImagePath(fileName: string): string {
  const asset = getStoredGeoAIAsset(fileName);
  if (!asset) throw new Error('Unregistered GeoAI asset');
  return `/api/geoai/evidence/${encodeURIComponent(fileName)}?v=${asset.sha256.slice(0, 16)}`;
}
