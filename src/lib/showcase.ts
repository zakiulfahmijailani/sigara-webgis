import type { FeatureCollection, Feature, Point, LineString, Polygon, MultiPolygon } from 'geojson';

export type Category = 'red' | 'orange' | 'green';
export type Filter = Category | 'all';

export const labels: Record<Category, string> = {
  red: 'Indikasi tinggi (simulasi)',
  orange: 'Indikasi sedang (simulasi)',
  green: 'Indikasi rendah (simulasi)',
};

export const colors: Record<Category, string> = {
  red: '#d45346',
  orange: '#c48a22',
  green: '#238673',
};

export const categoryFromMaster = (kategori: string): Category => {
  if (kategori === 'TINGGI_SIM') return 'red';
  if (kategori === 'SEDANG_SIM') return 'orange';
  return 'green';
};

export const masterFromCategory = (cat: Category): string => {
  if (cat === 'red') return 'TINGGI_SIM';
  if (cat === 'orange') return 'SEDANG_SIM';
  return 'RENDAH_SIM';
};

export type Episode = {
  id: string; // id_kelompok_rujukan_fktp (always string)
  cat: 'TINGGI_SIM' | 'SEDANG_SIM' | 'RENDAH_SIM';
  fromId: string;
  fromName: string;
  fromLon: number | null;
  fromLat: number | null;
  toId: string;
  toName: string;
  toLon: number | null;
  toLat: number | null;
  altId: string | null;
  altName: string | null;
  altLon: number | null;
  altLat: number | null;
  altOutside: boolean;
  distM: number | null;
  timeMin: number | null;
  altTimeMin: number | null;
  diffMin: number | null;
  timeRatio: number | null;
  nCloser: number | null;
  reason: string;
  fraudIdx: number | null;
  kabAsal: string;
  kabTujuan: string;
  distMethod: string;
  timeMethod: string;
  visitCount: number;
  firstDate: string | null;
  lastDate: string | null;
  month: string;
  hasGeoAI: boolean;
};

export type Visit = {
  visitId: string;
  dateFktp: string | null;
  dateFktpEnd: string | null;
  dateFkrtl: string | null;
  dateFkrtlEnd: string | null;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  diagnosa?: string | null;
  poli?: string | null;
};

export type GeoAIImage = {
  number: number;
  package: string;
  region: string;
  episode: string;
  kind: string; // banjir, longsor, kebakaran, pembanding
  mode: string; // dekat_proksi, di_luar_proksi, stabil, tanpa_data
  title: string;
  scenario: string; // A, B
  image: string;
  thumbnail: string;
  overlay: string;
  latar: string;
  corners: [[number, number], [number, number], [number, number], [number, number]];
  boundsWgs84: [number, number, number, number];
  bounds3857: [number, number, number, number];
  index: string; // MNDWI, NDVI, NBR
  rule: string;
  formula: string;
  paper: { short: string; url: string; title: string };
  candidatePixels: number;
  validFractionLand: number;
  nearProxyIntersection: boolean;
  qualityGapNearProxy: boolean;
  noRealDetection: boolean;
  nominalGridM: number;
  sha256: string;
};

export type GeoAICase = {
  package: string;
  region: string;
  episode: string;
  category: string;
  facilityIds: { asal?: string; tujuan?: string; alternatif?: string };
  facilityNames: { asal?: string; tujuan?: string };
  pointsWgs84: {
    asal: [number, number];
    tujuan: [number, number];
    alternatif: [number, number];
  };
  corners: [[number, number], [number, number], [number, number], [number, number]];
};

export type GeoAIManifest = {
  version: string;
  count: number;
  attribution: { sentinel: string; license: string; syntheticNote: string };
  papers: { citation: string; doi: string; topic: string }[];
  images: GeoAIImage[];
  cases: GeoAICase[];
};

export type FacilityProperties = {
  id: string;
  nama: string;
  peran: string;
  kelompok: string;
  kabkota: string;
  peranVerif: boolean;
  existVerif: boolean;
};

export type ShowcaseSummary = {
  version: string;
  snapshotAt: string;
  masterSha256: string;
  referenceSha256: string;
  scope: string;
  totals: {
    visits: number;
    episodes: number;
    participants: number;
    facilitiesReference: number;
    masterUniqueOrigins: number;
    masterUniqueDestinations: number;
    masterUniqueFacilities: number;
    geoaiEpisodes: number;
    outsideAltEpisodes: number;
  };
  episodeCategories: Record<'TINGGI_SIM' | 'SEDANG_SIM' | 'RENDAH_SIM', number>;
  visitCategories: Record<'TINGGI_SIM' | 'SEDANG_SIM' | 'RENDAH_SIM', number>;
  months: string[];
  districts: string[];
  geoaiEpisodeIds: string[];
  outsideAltEpisodeIds: string[];
  disclaimer: string;
};

export type ShowcaseData = {
  summary: ShowcaseSummary;
  boundary: FeatureCollection;
  districts: FeatureCollection;
  facilities: FeatureCollection;
  episodes: Episode[];
  geoai: GeoAIManifest;
};

export const formatNumber = (n: number) => new Intl.NumberFormat('id-ID').format(n);

export const formatMinutes = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return 'Belum tersedia';
  return `${n.toLocaleString('id-ID', { maximumFractionDigits: 1 })} menit`;
};

export const formatKm = (m: number | null | undefined): string => {
  if (m === null || m === undefined) return 'Belum tersedia';
  const km = m / 1000;
  return `${km.toLocaleString('id-ID', { maximumFractionDigits: 1 })} km`;
};

export const dateLabel = (s: string | null | undefined): string => {
  if (!s) return '—';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Makassar',
    }).format(new Date(s));
  } catch {
    return s;
  }
};

export const monthLabel = (m: string): string => {
  if (!m) return 'Semua';
  const parts = m.split('-');
  if (parts.length < 2) return m;
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const idx = parseInt(parts[1], 10) - 1;
  return `${monthNames[idx] || parts[1]} ${parts[0]}`;
};

export const reasonLabels: Record<string, string> = {
  tidak_ada: 'Tidak ada alasan khusus',
  layanan_khusus: 'Kebutuhan layanan khusus',
  kontinuitas: 'Kesinambungan perawatan',
  kapasitas_penuh: 'Kapasitas alternatif penuh',
  preferensi_pasien: 'Preferensi pasien',
  darurat: 'Kondisi darurat',
  rujukan_berulang: 'Rujukan berulang / kontrol berkala',
};

export const getReasonLabel = (reason: string | null | undefined): string => {
  if (!reason) return 'Tidak ada catatan khusus';
  return reasonLabels[reason] || reason.replace(/_/g, ' ');
};


export const formatFacilityName = (
  name: string | null | undefined,
  role: 'asal' | 'tujuan' | 'alternatif' = 'tujuan'
): string => {
  if (!name) return 'Faskes ' + role + ' — nama belum tersedia';
  if (name.toLowerCase().includes('tanpa nama')) {
    return 'Faskes ' + role + ' — nama belum tersedia';
  }
  return name;
};
