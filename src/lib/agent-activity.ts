import type { Episode } from './showcase';
import { getNeonGeoAIImagePath } from './geoai-storage';

export type InitialCategory = 'high' | 'medium' | 'low' | 'unknown';
export type GeoAIEligibility = 'eligible' | 'skipped' | 'unknown';
export type ReviewStatus = 'queued' | 'running' | 'completed' | 'insufficient' | 'failed' | 'skipped';
export type ReviewMode = 'actual' | 'simulation';

export type EpisodeEligibilityResult = {
  initialIndex: number | null;
  initialCategory: InitialCategory;
  initialModelVersion: string;
  eligibility: GeoAIEligibility;
  eligibilityReason: string;
};

export type ReviewedEpisodeRecord = {
  episodeId: string;
  initialIndex: number | null;
  initialCategory: InitialCategory;
  eligibility: GeoAIEligibility;
  eligibilityReason: string;
  reviewedIndex: number | null;
  reviewedCategory: InitialCategory | null;
  reviewStatus: ReviewStatus;
  reviewMode: ReviewMode;
  timestamp: string;
  findings: string;
  isNewPriority: boolean;
  priorityReason?: string;
  region: string;
  fromName: string;
  toName: string;
  altName?: string | null;
};

export type AgentReport = {
  id: string;
  episodeId: string;
  title: string;
  createdAt: string;
  initialIndex: number | null;
  initialCategory: InitialCategory;
  fromName: string;
  toName: string;
  altName: string;
  proxyDistanceKm: number;
  timeRatio: number;
  summary: string;
  recommendations: string[];
  evidenceFileName?: string;
  evidenceImageUrl?: string;
  isSimulation: boolean;
};

export type AgentActivityLog = {
  id: string;
  timestamp: string;
  stepName: string;
  episodeId: string;
  mode: ReviewMode;
  status: 'completed' | 'running' | 'warn';
  detail: string;
};

export type AgentNotification = {
  id: string;
  episodeId: string;
  recipientRole: string;
  channel: string;
  status: 'simulated_queue' | 'draft';
  subject: string;
  body: string;
  createdAt: string;
};

export type AgentActivityState = {
  version: string;
  systemStatus: 'ready' | 'reviewing' | 'waiting' | 'attention' | 'unavailable';
  lastRunTimestamp: string | null;
  baselineTimestamp: string | null;
  reviewedEpisodes: Record<string, ReviewedEpisodeRecord>;
  reports: Record<string, AgentReport>;
  logs: AgentActivityLog[];
  notifications: AgentNotification[];
};

export const INITIAL_MODEL_VERSION = 'v1.0-master-proximity';
export const AGENT_STORAGE_KEY = 'sigara-agent-activity-v2';

/**
 * Determine eligibility based STRICTLY on INITIAL index and category.
 * Master thresholds: low <= 30, medium > 30 to 60, high > 60.
 * If initialIndex is null/undefined, eligibility is 'unknown' (never assumed low!).
 */
export function getEpisodeEligibility(
  episode: Pick<Episode, 'id' | 'cat' | 'fraudIdx'>
): EpisodeEligibilityResult {
  const initialIndex = episode.fraudIdx;

  if (initialIndex == null) {
    return {
      initialIndex: null,
      initialCategory: 'unknown',
      initialModelVersion: INITIAL_MODEL_VERSION,
      eligibility: 'unknown',
      eligibilityReason: 'Indeks awal tidak tersedia — status kelayakan tidak dapat ditentukan.',
    };
  }

  if (episode.cat === 'TINGGI_SIM' || initialIndex > 60) {
    return {
      initialIndex,
      initialCategory: 'high',
      initialModelVersion: INITIAL_MODEL_VERSION,
      eligibility: 'eligible',
      eligibilityReason: 'Indeks awal tinggi (>60) — memenuhi ambang prioritas penelaahan GeoAI.',
    };
  }

  if (episode.cat === 'SEDANG_SIM' || (initialIndex > 30 && initialIndex <= 60)) {
    return {
      initialIndex,
      initialCategory: 'medium',
      initialModelVersion: INITIAL_MODEL_VERSION,
      eligibility: 'skipped',
      eligibilityReason: 'Indeks awal sedang (31–60) — pemeriksaan GeoAI dilewati pada alur ini.',
    };
  }

  return {
    initialIndex,
    initialCategory: 'low',
    initialModelVersion: INITIAL_MODEL_VERSION,
    eligibility: 'skipped',
    eligibilityReason: 'Indeks awal rendah (≤30) — pemeriksaan GeoAI tidak diprioritaskan.',
  };
}

/**
 * Get initial clean state. Truthful starting values: 0 reviewed, no baseline.
 */
export function getInitialAgentState(): AgentActivityState {
  return {
    version: '2.0.0',
    systemStatus: 'ready',
    lastRunTimestamp: null,
    baselineTimestamp: null,
    reviewedEpisodes: {},
    reports: {},
    logs: [],
    notifications: [],
  };
}

/**
 * Read agent activity state from localStorage safely with version check and validation.
 */
export function loadAgentState(): AgentActivityState {
  if (typeof window === 'undefined') {
    return getInitialAgentState();
  }
  try {
    const raw = window.localStorage.getItem(AGENT_STORAGE_KEY);
    if (!raw) return getInitialAgentState();
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version && parsed.reviewedEpisodes && parsed.reports) {
      return parsed as AgentActivityState;
    }
  } catch {
    // If JSON corrupted, return initial clean state
  }
  return getInitialAgentState();
}

/**
 * Save agent activity state to localStorage safely.
 */
export function saveAgentState(state: AgentActivityState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save agent state to localStorage:', err);
  }
}

/**
 * Generate a complete, printable HTML report object for an episode.
 * Deduplicates per episode ID.
 */
export function createEpisodeReport(
  episode: Episode,
  reviewedRecord?: ReviewedEpisodeRecord | null
): AgentReport {
  const eligibility = getEpisodeEligibility(episode);
  const now = new Date().toISOString();

  const distKm = episode.distM != null ? episode.distM / 1000 : 0;
  const ratio = episode.timeRatio != null ? episode.timeRatio : 1.0;

  return {
    id: `RPT-${episode.id}`,
    episodeId: episode.id,
    title: `Laporan Penelaahan Spasial Episode ${episode.id}`,
    createdAt: reviewedRecord?.timestamp || now,
    initialIndex: eligibility.initialIndex,
    initialCategory: eligibility.initialCategory,
    fromName: episode.fromName,
    toName: episode.toName,
    altName: episode.altOutside ? 'Faskes Luar NTT' : (episode.altName || '-'),
    proxyDistanceKm: distKm,
    timeRatio: ratio,
    summary: `Episode rujukan dari ${episode.fromName} menuju ${episode.toName} tercatat memiliki SIGARA Index awal ${eligibility.initialIndex != null ? eligibility.initialIndex.toFixed(1) : '-'} / 100. ${
      episode.altId
        ? `Terdapat fasilitas rujukan alternatif lebih dekat (${episode.altOutside ? 'Luar NTT' : episode.altName}) dengan rasio waktu proksi ${ratio.toFixed(2)}x.`
        : 'Fasilitas tujuan merupakan pilihan rujukan paling efisien secara proksi.'
    }`,
    recommendations: [
      'Verifikasi alasan klinis dan ketersediaan dokter spesialis pada tanggal rujukan di faskes tujuan.',
      'Periksa apakah pengalihan rujukan dipicu oleh kendala transportasi lokal atau kondisi darurat pasien.',
      'Gunakan bukti spasial dan penginderaan jauh sebagai bahan telaah objektif dalam klarifikasi faskes.',
    ],
    evidenceFileName: '01_NTT-01_banjir_A_v4.png',
    evidenceImageUrl: getNeonGeoAIImagePath('01_NTT-01_banjir_A_v4.png'),
    isSimulation: true,
  };
}

/**
 * Run a multi-step demonstration simulation on a defined small batch of eligible high-risk episodes.
 * Strictly prevents double-counting: repeated runs on the same episodes update timestamps rather than adding duplicates.
 */
export async function runDemonstrationSimulation(
  highEpisodes: Episode[],
  currentState: AgentActivityState,
  onStepProgress?: (step: number, total: number, message: string) => void
): Promise<AgentActivityState> {
  const targetEpisodes = highEpisodes.slice(0, 3);
  if (!targetEpisodes.length) return currentState;

  const now = new Date();
  const timestampStr = now.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const updated = {
    ...currentState,
    systemStatus: 'reviewing' as const,
  };

  const steps = [
    'Memeriksa SIGARA Index awal & kelayakan episode',
    'Menyiapkan konteks asal, tujuan, dan alternatif',
    'Mengambil citra & indikator spasial dari Neon Object Storage',
    'Menilai akuntabilitas proksi koridor transportasi',
    'Menyusun kesimpulan telaah & rekomendasi',
    'Membuat draf laporan & menyiapkan antrean notifikasi',
  ];

  for (let i = 0; i < steps.length; i++) {
    if (onStepProgress) {
      onStepProgress(i + 1, steps.length, steps[i]);
    }
    // Brief async yield for smooth UI animation
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  // Update reviewed episodes
  const updatedReviewed = { ...updated.reviewedEpisodes };
  const updatedReports = { ...updated.reports };
  const newLogs: AgentActivityLog[] = [...updated.logs];

  targetEpisodes.forEach((ep, idx) => {
    const isNew = idx === 0; // First episode marked as newly flagged finding
    const record: ReviewedEpisodeRecord = {
      episodeId: ep.id,
      initialIndex: ep.fraudIdx,
      initialCategory: 'high',
      eligibility: 'eligible',
      eligibilityReason: 'Indeks awal tinggi (>60) — memenuhi ambang prioritas penelaahan GeoAI.',
      reviewedIndex: ep.fraudIdx, // Transparent: review does not arbitrarily alter score
      reviewedCategory: 'high',
      reviewStatus: 'completed',
      reviewMode: 'simulation',
      timestamp: timestampStr,
      findings: ep.altId
        ? `Terdapat faskes alternatif terdekat (${ep.altOutside ? 'Luar NTT' : ep.altName}). Rasio waktu tempuh ${ep.timeRatio ? ep.timeRatio.toFixed(2) + 'x' : 'tinggi'}.`
        : 'Fasilitas tujuan teridentifikasi sesuai proksi terdekat.',
      isNewPriority: isNew,
      priorityReason: isNew
        ? 'Selisih waktu rujukan signifikan (+45 mnt) dengan keberadaan faskes rujukan alternatif yang layak.'
        : undefined,
      region: ep.kabAsal,
      fromName: ep.fromName,
      toName: ep.toName,
      altName: ep.altOutside ? 'Faskes Luar NTT' : (ep.altName || '-'),
    };

    updatedReviewed[ep.id] = record;

    // Automatically create report for the primary reviewed episode
    if (!updatedReports[ep.id]) {
      updatedReports[ep.id] = createEpisodeReport(ep, record);
    }

    newLogs.unshift({
      id: `LOG-${ep.id}-${Date.now()}`,
      timestamp: timestampStr,
      stepName: 'Penelaahan Selesai',
      episodeId: ep.id,
      mode: 'simulation',
      status: 'completed',
      detail: `Selesai menelaah koridor ${ep.fromName} → ${ep.toName}. Status: ${isNew ? 'Prioritas Baru' : 'Selesai'}`,
    });
  });

  // Keep last 30 logs
  const trimmedLogs = newLogs.slice(0, 30);

  // Simulated notification in outbox
  const updatedNotifications: AgentNotification[] = [
    {
      id: `NOTIF-${targetEpisodes[0].id}`,
      episodeId: targetEpisodes[0].id,
      recipientRole: 'Tim Verifikasi Klaim BPJS Cabang Kupang',
      channel: 'Kanal Internal Verifikasi (Simulasi)',
      status: 'simulated_queue',
      subject: `[SIMULASI] Rekomendasi Telaah Episode Prioritas Baru: ${targetEpisodes[0].id}`,
      body: `Episode ${targetEpisodes[0].id} dari ${targetEpisodes[0].fromName} ke ${targetEpisodes[0].toName} telah selesai ditelaah oleh SIGARA Agent dengan indeks ${targetEpisodes[0].fraudIdx != null ? targetEpisodes[0].fraudIdx.toFixed(1) : '-'}. Silakan periksa berkas telaah dan laporan sebelum konfirmasi.`,
      createdAt: timestampStr,
    },
    ...updated.notifications.filter((n) => n.episodeId !== targetEpisodes[0].id),
  ];

  const finalState: AgentActivityState = {
    ...updated,
    systemStatus: 'ready',
    lastRunTimestamp: timestampStr,
    baselineTimestamp: updated.baselineTimestamp || timestampStr,
    reviewedEpisodes: updatedReviewed,
    reports: updatedReports,
    logs: trimmedLogs,
    notifications: updatedNotifications,
  };

  saveAgentState(finalState);
  return finalState;
}
