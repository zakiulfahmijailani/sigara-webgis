import type { Episode, ShowcaseData } from './showcase';

// Lossless columnar JSON avoids repeating field names for every episode.
export const EPISODE_COLUMNS = [
  'id','cat','fromId','fromName','fromLon','fromLat','toId','toName','toLon','toLat',
  'altId','altName','altLon','altLat','altOutside','distM','timeMin','altTimeMin',
  'diffMin','timeRatio','nCloser','reason','fraudIdx','kabAsal','kabTujuan','distMethod',
  'timeMethod','visitCount','firstDate','lastDate','month','hasGeoAI',
] as const satisfies readonly (keyof Episode)[];

export function encodeShowcase(data: ShowcaseData) {
  return { encoding: 'episode-columns-v1', data: { ...data, episodes: data.episodes.map(ep => EPISODE_COLUMNS.map(key => ep[key])) } };
}

export function decodeShowcase(payload: unknown): ShowcaseData {
  const envelope = payload as { encoding?: string; data?: ShowcaseData & { episodes: unknown[] } };
  const data = envelope?.data;
  if (!data || !Array.isArray(data.episodes)) throw new Error('Invalid showcase response');
  if (envelope.encoding === undefined) return data as ShowcaseData;
  if (envelope.encoding !== 'episode-columns-v1') throw new Error('Unsupported showcase encoding');
  const episodes = (data.episodes as unknown[]).map(row => {
    if (!Array.isArray(row) || row.length !== EPISODE_COLUMNS.length) throw new Error('Invalid episode row');
    return Object.fromEntries(EPISODE_COLUMNS.map((key, index) => [key, row[index]])) as Episode;
  });
  return { ...data, episodes };
}
