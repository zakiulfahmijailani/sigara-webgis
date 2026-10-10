import type { Feature, MultiPolygon, MultiLineString, LineString } from 'geojson';
export type Category = 'red' | 'orange' | 'green';
export type Filter = Category | 'all';
export type Facility = { id: string; kind: 'FKTP' | 'RS'; lon: number; lat: number; node: number };
export type Route = { from: string; to: string; minutes: number | null; km: number | null; geometry: LineString | null };
export type Referral = {
  id: string; date: string; month: string; from: string; to: string; service: string;
  reason: string; verified: boolean; evidence: boolean; eligible: boolean; emergency: boolean;
  documentId: string; capacities: Record<string, boolean | null>; showcaseAdjusted: boolean;
};
export type ShowcaseData = {
  metadata: { version: string; snapshotAt: string; expectedCounts: Record<Category, number>; baseCounts: Record<Category, number>; adjustedIds: string[]; sourceHash: string; city: string; policy: string };
  facilities: Facility[]; routes: Route[]; capabilities: Record<string, Record<string, boolean>>;
  boundary: Feature<MultiPolygon>; roads: MultiLineString;
  publicFacilities: { id: string; name: string; lon: number; lat: number }[];
  cases: Referral[];
};
export type Assessment = {
  category: Category; status: string; targetMinutes: number | null; bestMinutes: number | null;
  bestId: string | null; extra: number | null; ratio: number | null;
  alternatives: { id: string; minutes: number }[]; missing: string[]; routeComplete: boolean;
  rules: { extra: boolean; ratio: boolean; alternatives: boolean };
};
export const labels: Record<Category, string> = { red: 'Prioritas pemeriksaan', orange: 'Perlu kelengkapan data', green: 'Tidak diprioritaskan' };
export const colors: Record<Category, string> = { red: '#d45346', orange: '#c48a22', green: '#238673' };
export const formatNumber = (n: number) => new Intl.NumberFormat('id-ID').format(n);
export const minutes = (n: number | null) => n === null ? 'Belum tersedia' : `${n.toLocaleString('id-ID', { maximumFractionDigits: 1 })} menit`;
export const dateLabel = (s: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' }).format(new Date(s));
export const reasonLabels: Record<string, string> = { tidak_ada: 'Tidak ada alasan khusus', layanan_khusus: 'Kebutuhan layanan khusus', kontinuitas: 'Kesinambungan perawatan', kapasitas_penuh: 'Kapasitas alternatif penuh', preferensi_pasien: 'Preferensi pasien', darurat: 'Kondisi darurat' };
// Reproducible triage. No LLM-generated route times or invented numerical weights.
export function assess(r: Referral, data: Pick<ShowcaseData, 'routes' | 'capabilities'>): Assessment {
  const times = new Map(data.routes.filter(x => x.from === r.from).map(x => [x.to, x.minutes]));
  const capable = Object.keys(data.capabilities).filter(id => data.capabilities[id][r.service]);
  const feasible = capable.filter(id => r.eligible && r.capacities[id] === true && times.get(id) != null)
    .map(id => ({ id, minutes: times.get(id)! })).sort((a, b) => a.minutes - b.minutes || a.id.localeCompare(b.id));
  const targetMinutes = times.get(r.to) ?? null;
  const best = feasible[0];
  const extra = targetMinutes !== null && best ? targetMinutes - best.minutes : null;
  const ratio = targetMinutes !== null && best ? targetMinutes / Math.max(best.minutes, .1) : null;
  const alternatives = feasible.filter(x => x.id !== r.to && targetMinutes !== null && x.minutes < targetMinutes);
  const routeComplete = targetMinutes !== null && capable.every(id => times.get(id) != null);
  const missing = [
    ...(!r.evidence ? ['Bukti pendukung belum lengkap'] : []),
    ...(capable.some(id => r.capacities[id] == null) ? ['Kapasitas saat rujukan belum diketahui'] : []),
    ...(!routeComplete ? ['Rute pembanding belum tersedia'] : []),
    ...(!r.eligible ? ['Kelayakan rujukan JKN perlu diklarifikasi'] : []),
    ...(!capable.includes(r.to) ? ['Kesesuaian layanan tujuan belum terpenuhi'] : []),
    ...(r.capacities[r.to] !== true ? ['Kapasitas tujuan belum terkonfirmasi tersedia'] : []),
    ...(!feasible.length ? ['Belum ada alternatif layak yang dapat dinilai'] : []),
  ];
  const rules = { extra: extra !== null && extra >= 8, ratio: ratio !== null && ratio >= 1.5, alternatives: alternatives.length >= 2 };
  const documented = r.verified && r.reason !== 'tidak_ada';
  const category: Category = missing.length ? 'orange' : documented ? 'green' : Object.values(rules).every(Boolean) ? 'red' : 'green';
  const status = category === 'orange' ? 'Data belum cukup' : documented ? 'Alasan terdokumentasi' : category === 'red' ? 'Perlu pemeriksaan' : 'Sesuai model';
  return { category, status, targetMinutes, bestMinutes: best?.minutes ?? null, bestId: best?.id ?? null, extra, ratio, alternatives, missing, routeComplete, rules };
}
export function explanation(r: Referral, a: Assessment): string {
  if (a.category === 'orange') return `${a.missing.join('. ')}. Lengkapi informasi sebelum menarik kesimpulan.`;
  if (a.status === 'Alasan terdokumentasi') return 'Pemilihan tujuan memiliki alasan yang terverifikasi dalam skenario sintetis. Alasan ini diperhitungkan sebelum menentukan prioritas.';
  if (a.category === 'green') return 'Kombinasi selisih waktu, rasio perjalanan, dan jumlah alternatif tidak memenuhi seluruh ambang prioritas pemeriksaan.';
  return `Terdapat ${a.alternatives.length} RS alternatif lebih cepat yang memenuhi layanan dan kapasitas. Tujuan menambah ${minutes(a.extra)}, dengan waktu ${a.ratio?.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kali alternatif tercepat. Tidak ada alasan khusus terverifikasi yang menjelaskan pilihan tujuan.`;
}
