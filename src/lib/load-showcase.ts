import type { ShowcaseData } from './showcase';
import { decodeShowcase } from './showcase-wire';

const requests = new Map<string, { at: number; pending: Promise<ShowcaseData> }>();
export function loadShowcase(episodeId?: string): Promise<ShowcaseData> {
  const key = episodeId ?? 'overview';
  const prior = requests.get(key);
  if (prior && Date.now() - prior.at < 300_000) return prior.pending;
  const params = new URLSearchParams({ compact: '1', names: '20261031-v2' });
  if (episodeId !== undefined) params.set('episodeId', episodeId);
  const pending = fetch(`/api/showcase?${params}`).then(async response => {
    if (!response.ok) throw new Error('Data unavailable');
    return decodeShowcase(await response.json());
  }).catch(error => { requests.delete(key); throw error; });
  requests.set(key, { at: Date.now(), pending });
  // Bound detail cache during prolonged navigation.
  if (requests.size > 20) requests.delete(requests.keys().next().value!);
  return pending;
}
