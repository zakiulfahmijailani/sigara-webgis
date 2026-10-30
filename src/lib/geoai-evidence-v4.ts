import v4Data from '@/data/ntt-generated-evidence-v4.json';
import type { Episode } from './showcase';
import { getNeonGeoAIImagePath } from './geoai-storage';

export type GeneratedEpisodeEvidence = {
  id: string;
  number: number;
  packageId: string;
  region: string;
  episodeId: string;
  episodeDateRange: [string, string];
  scenario: 'A' | 'B';
  kind: 'banjir' | 'longsor' | 'kebakaran' | 'pembanding';
  scenarioMode: 'dekat_proksi' | 'di_luar_proksi' | 'stabil' | 'tanpa_data';
  scenarioLabel: string;
  title: string;
  fileName: string;
  imageUrl: string;
  width: number;
  height: number;
  assetVersion: 'sigara-generated-evidence-v4';
  synthetic: true;
  georeferenced: false;
  replacesGalleryImage?: string;
  sourceManifest: string;
};

export type GeoAIAnalysisStatus =
  | 'completed' // Hasil analisis tersedia dengan bukti skenario
  | 'insufficient' // Bukti observasi tidak memadai / tutupan awan
  | 'not_run' // Analisis belum dijalankan
  | 'skipped' // Tidak diprioritaskan pada tahap ini (kategori rendah)
  | 'unknown'; // Belum tersedia dalam paket percontohan saat ini

export type GeoAIStatusInfo = {
  status: GeoAIAnalysisStatus;
  badgeLabel: string;
  title: string;
  description: string;
  isAvailable: boolean;
};

export const V4_EVIDENCE_ITEMS: GeneratedEpisodeEvidence[] = (v4Data.items as GeneratedEpisodeEvidence[]).map(item => ({
  ...item,
  imageUrl: getNeonGeoAIImagePath(item.fileName),
}));

/**
 * Get all v4 evidence items
 */
export function getAllEvidence(): GeneratedEpisodeEvidence[] {
  return V4_EVIDENCE_ITEMS;
}

/**
 * Get all v4 evidence items for a given episode ID
 */
export function getEvidenceForEpisode(episodeId: string): GeneratedEpisodeEvidence[] {
  if (!episodeId) return [];
  return V4_EVIDENCE_ITEMS.filter((item) => String(item.episodeId) === String(episodeId));
}

export const SHOWCASE_ASSIGNMENT_VERSION = 'v4-high-risk-demo-v1';

export type ShowcaseEvidenceAssignment = {
  episodeId: string;
  sourceEpisodeId: string;
  isReassigned: boolean;
  version: typeof SHOWCASE_ASSIGNMENT_VERSION;
  items: GeneratedEpisodeEvidence[];
};

/** Assign an existing A/B illustration pair to high-risk episodes only.
 * Source metadata stays intact: this is a showcase pairing, not an observation.
 * A seeded hash keeps the random choice stable across reloads and SSR/hydration.
 */
export function getShowcaseEvidenceForEpisode(
  episode: Pick<Episode, 'id' | 'cat'>
): ShowcaseEvidenceAssignment | null {
  if (!episode.id || episode.cat !== 'TINGGI_SIM') return null;

  const sourceIds = [...new Set(V4_EVIDENCE_ITEMS.map(item => item.episodeId))].sort();
  if (!sourceIds.length) return null;
  const direct = getEvidenceForEpisode(episode.id);
  let hash = 2166136261;
  for (const char of `${SHOWCASE_ASSIGNMENT_VERSION}|${episode.id}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  }
  const sourceEpisodeId = direct.length ? episode.id : sourceIds[hash % sourceIds.length];
  return {
    episodeId: episode.id,
    sourceEpisodeId,
    isReassigned: sourceEpisodeId !== episode.id,
    version: SHOWCASE_ASSIGNMENT_VERSION,
    items: getEvidenceForEpisode(sourceEpisodeId).slice().sort((a, b) => a.scenario.localeCompare(b.scenario)),
  };
}

/**
 * Get specific scenario (A or B) for a given episode ID
 */
export function getEpisodeEvidenceScenario(
  episodeId: string,
  scenario: 'A' | 'B' = 'A'
): GeneratedEpisodeEvidence | null {
  const list = getEvidenceForEpisode(episodeId);
  return list.find((item) => item.scenario === scenario) || list[0] || null;
}

/**
 * Get truthful analysis & availability status for an episode
 */
export function getEpisodeGeoAIStatus(
  episode: Episode,
  activeEvidence?: GeneratedEpisodeEvidence | null
): GeoAIStatusInfo {
  if (episode.cat !== 'TINGGI_SIM') {
    return {
      status: 'skipped',
      badgeLabel: 'Tidak Ditampilkan',
      title: 'Galeri Ilustrasi Difokuskan pada Episode Indikasi Tinggi',
      description: 'Penempatan gambar demonstrasi hanya berlaku untuk kategori tinggi pada data master.',
      isAvailable: false,
    };
  }
  // If episode has evidence items in v4
  if (activeEvidence) {
    if (activeEvidence.kind === 'pembanding' && activeEvidence.scenarioMode === 'tanpa_data') {
      return {
        status: 'insufficient',
        badgeLabel: 'Bukti Belum Cukup',
        title: 'Skenario Ilustrasi: Bukti Belum Cukup untuk Menilai Akses',
        description: 'Gambar contoh memodelkan observasi yang tidak memadai; bukan hasil pengamatan aktual episode ini.',
        isAvailable: true,
      };
    }
    if (activeEvidence.kind === 'pembanding' && activeEvidence.scenarioMode === 'stabil') {
      return {
        status: 'completed',
        badgeLabel: 'Kondisi Stabil',
        title: 'Skenario Ilustrasi: Tanpa Perubahan Signifikan',
        description: 'Gambar contoh memodelkan kondisi stabil; bukan konfirmasi akses aktual episode ini.',
        isAvailable: true,
      };
    }
    return {
      status: 'completed',
      badgeLabel: 'Ilustrasi Skenario Tersedia',
      title: `Analisis Spasial: Skenario ${activeEvidence.scenario} (${activeEvidence.title})`,
      description: activeEvidence.scenarioLabel,
      isAvailable: true,
    };
  }

  // Episode does not have v4 evidence in the 8-episode POC package
  return {
    status: 'unknown',
    badgeLabel: 'Belum Tersedia',
    title: 'Ilustrasi GeoAI Belum Tersedia dalam Paket Ini',
    description: 'Paket percontohan GeoAI saat ini memuat ilustrasi untuk 8 episode representatif. Episode ini belum memiliki berkas analisis citra.',
    isAvailable: false,
  };
}
