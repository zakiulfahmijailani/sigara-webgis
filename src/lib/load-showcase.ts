import type { ShowcaseData } from './showcase';

// Share the snapshot across client-side navigation; failed requests remain retryable.
let pending: Promise<ShowcaseData> | null = null;
let loadedAt = 0;
export function loadShowcase(): Promise<ShowcaseData> {
  if (!pending || Date.now() - loadedAt > 300_000) {
    loadedAt = Date.now();
    pending = fetch('/api/showcase').then(async response => {
      if (!response.ok) throw new Error('Snapshot unavailable');
      const payload = await response.json();
      if (!Array.isArray(payload.data?.episodes)) throw new Error('Invalid snapshot');
      return payload.data as ShowcaseData;
    }).catch(error => { pending = null; throw error; });
  }
  return pending;
}
