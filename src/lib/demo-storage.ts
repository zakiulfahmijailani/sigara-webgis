const memory = new Map<string, string>();
const temporaryKeys = new Set<string>();
export function readDemoStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  if (temporaryKeys.has(key)) return memory.get(key) ?? null;
  try { return window.localStorage.getItem(key) ?? memory.get(key) ?? null; }
  catch { return memory.get(key) ?? null; }
}
export function writeDemoStorage(key: string, value: string): void {
  memory.set(key, value);
  try { window.localStorage.setItem(key, value); temporaryKeys.delete(key); }
  catch { temporaryKeys.add(key); }
  window.dispatchEvent(new Event('sigara-demo-change'));
}
export function demoStorageAvailable(): boolean {
  try { const key = 'sigara-storage-probe'; window.localStorage.setItem(key, '1'); window.localStorage.removeItem(key); return true; }
  catch { return false; }
}
export function removeLegacyDemoStorage(): void {
  const key = 'sigara-agent-activity-v3';
  memory.delete(key);
  temporaryKeys.delete(key);
  try { window.localStorage.removeItem(key); } catch { /* unavailable */ }
  window.dispatchEvent(new Event('sigara-demo-change'));
}
