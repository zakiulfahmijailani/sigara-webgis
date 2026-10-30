import v4Data from '@/data/ntt-generated-evidence-v4.json';
import type { Episode } from './showcase';

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

export const V4_EVIDENCE_ITEMS: GeneratedEpisodeEvidence[] = v4Data.items as GeneratedEpisodeEvidence[];

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
  // If episode has evidence items in v4
  if (activeEvidence) {
    if (activeEvidence.kind === 'pembanding' && activeEvidence.scenarioMode === 'tanpa_data') {
      return {
        status: 'insufficient',
        badgeLabel: 'Bukti Belum Cukup',
        title: 'Bukti GeoAI Belum Cukup untuk Menilai Akses',
        description: 'Observasi penginderaan jauh terhalang tutupan awan atau data tidak memadai pada rentang tanggal rujukan.',
        isAvailable: true,
      };
    }
    if (activeEvidence.kind === 'pembanding' && activeEvidence.scenarioMode === 'stabil') {
      return {
        status: 'completed',
        badgeLabel: 'Kondisi Stabil',
        title: 'Analisis Selesai: Tanpa Perubahan Signifikan',
        description: 'Tidak terdeteksi anomali spektral banjir, longsor, atau kebakaran pada koridor pengamatan.',
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
  if (episode.cat === 'RENDAH_SIM') {
    return {
      status: 'skipped',
      badgeLabel: 'Tidak Diprioritaskan',
      title: 'Analisis GeoAI Tidak Diprioritaskan pada Tahap Ini',
      description: 'Episode berada dalam kategori Indikasi Rendah (RENDAH_SIM) master. Paket POC v4 difokuskan pada episode percontohan.',
      isAvailable: false,
    };
  }

  return {
    status: 'unknown',
    badgeLabel: 'Belum Tersedia',
    title: 'Ilustrasi GeoAI Belum Tersedia dalam Paket Ini',
    description: 'Paket percontohan GeoAI saat ini memuat ilustrasi untuk 8 episode representatif. Episode ini belum memiliki berkas analisis citra.',
    isAvailable: false,
  };
}
