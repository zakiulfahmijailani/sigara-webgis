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
  status: 'sent' | 'simulated_queue' | 'draft';
  subject: string;
  body: string;
  createdAt: string;
};

export type AgentStats = {
  episodesReviewed: number;
  episodesReviewedToday: number;
  priorityFindings: number;
  criticalNew: number;
  reportsGenerated: number;
  reportsToday: number;
  stakeholdersNotified: number;
  notificationsPending: number;
};

export type AgentActivityState = {
  version: string;
  systemStatus: 'ready' | 'reviewing' | 'waiting' | 'attention' | 'unavailable';
  lastRunTimestamp: string | null;
  baselineTimestamp: string | null;
  nextRunCountdown: string;
  stats: AgentStats;
  reviewedEpisodes: Record<string, ReviewedEpisodeRecord>;
  reports: Record<string, AgentReport>;
  logs: AgentActivityLog[];
  notifications: AgentNotification[];
};

export const INITIAL_MODEL_VERSION = 'v1.0-master-proximity';
export const AGENT_STORAGE_KEY = 'sigara-agent-activity-v3';

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
 * Get initial state populated with realistic automated GeoAI agent metrics.
 * Runs autonomously in the background across 364 high-risk episodes in NTT.
 */
export function getInitialAgentState(): AgentActivityState {
  const defaultReviewed: Record<string, ReviewedEpisodeRecord> = {
    'EP-001': {
      episodeId: 'EP-001',
      initialIndex: 84.5,
      initialCategory: 'high',
      eligibility: 'eligible',
      eligibilityReason: 'Indeks awal tinggi (>60) — prioritas penelaahan GeoAI koridor NTT.',
      reviewedIndex: 84.5,
      reviewedCategory: 'high',
      reviewStatus: 'completed',
      reviewMode: 'actual',
      timestamp: '30 Okt 2026, 16.30 WITA',
      findings: 'Terdeteksi anomali rujukan bypass faskes rujukan terdekat saat kondisi cuaca ekstrem / banjir rob pesisir di koridor Sikka.',
      isNewPriority: true,
      priorityReason: 'Kondisi cuaca ekstrem memicu bypass rujukan; selisih waktu proksi +45 mnt.',
      region: 'Kab. Sikka',
      fromName: 'Puskesmas Wolomarang',
      toName: 'RSUD Dr. T.C. Hillers',
      altName: 'Klinik Pratama St. Elisabeth',
    },
    'EP-002': {
      episodeId: 'EP-002',
      initialIndex: 88.0,
      initialCategory: 'high',
      eligibility: 'eligible',
      eligibilityReason: 'Indeks awal tinggi (>60) — prioritas penelaahan GeoAI koridor NTT.',
      reviewedIndex: 88.0,
      reviewedCategory: 'high',
      reviewStatus: 'completed',
      reviewMode: 'actual',
      timestamp: '30 Okt 2026, 16.15 WITA',
      findings: 'Rujukan melewati faskes tipe C terdekat menuju RSUP Kupang dengan rasio waktu proksi 1.85x.',
      isNewPriority: true,
      priorityReason: 'Rasio selisih waktu proksi tinggi terhadap faskes alternatif terdekat yang memadai.',
      region: 'Kota Kupang',
      fromName: 'Puskesmas Oesao',
      toName: 'RSUD Prof. W.Z. Johannes',
      altName: 'RS Tingkat IV Wirasakti',
    },
    'EP-003': {
      episodeId: 'EP-003',
      initialIndex: 79.2,
      initialCategory: 'high',
      eligibility: 'eligible',
      eligibilityReason: 'Indeks awal tinggi (>60) — prioritas penelaahan GeoAI koridor NTT.',
      reviewedIndex: 79.2,
      reviewedCategory: 'high',
      reviewStatus: 'completed',
      reviewMode: 'actual',
      timestamp: '30 Okt 2026, 15.45 WITA',
      findings: 'Kandidat rujukan darurat kepulauan; waktu tempuh terverifikasi sesuai kondisi jalan perbukitan.',
      isNewPriority: false,
      region: 'Kab. Manggarai Barat',
      fromName: 'Puskesmas Labuan Bajo',
      toName: 'RS Siloam Labuan Bajo',
      altName: 'RSUD Komodo',
    },
    'EP-004': {
      episodeId: 'EP-004',
      initialIndex: 81.4,
      initialCategory: 'high',
      eligibility: 'eligible',
      eligibilityReason: 'Indeks awal tinggi (>60) — prioritas penelaahan GeoAI koridor NTT.',
      reviewedIndex: 81.4,
      reviewedCategory: 'high',
      reviewStatus: 'completed',
      reviewMode: 'actual',
      timestamp: '30 Okt 2026, 15.10 WITA',
      findings: 'Rujukan perbatasan Belu dengan rute jalan berkelok; rasio alternatif terkonfirmasi.',
      isNewPriority: false,
      region: 'Kab. Belu',
      fromName: 'Puskesmas Atambua Selatan',
      toName: 'RSUD Mgr. Gabriel Manek SVD',
      altName: 'RS Marianum Halilulik',
    },
    'EP-005': {
      episodeId: 'EP-005',
      initialIndex: 76.8,
      initialCategory: 'high',
      eligibility: 'eligible',
      eligibilityReason: 'Indeks awal tinggi (>60) — prioritas penelaahan GeoAI koridor NTT.',
      reviewedIndex: 76.8,
      reviewedCategory: 'high',
      reviewStatus: 'completed',
      reviewMode: 'actual',
      timestamp: '30 Okt 2026, 14.50 WITA',
      findings: 'Penelaahan koridor Ende-Nangapanda; hambatan topografi perbukitan memvalidasi rute.',
      isNewPriority: false,
      region: 'Kab. Ende',
      fromName: 'Puskesmas Kota Ende',
      toName: 'RSUD Ende',
      altName: 'RS Santo Antonius Jopu',
    },
    'EP-006': {
      episodeId: 'EP-006',
      initialIndex: 82.1,
      initialCategory: 'high',
      eligibility: 'eligible',
      eligibilityReason: 'Indeks awal tinggi (>60) — prioritas penelaahan GeoAI koridor NTT.',
      reviewedIndex: 82.1,
      reviewedCategory: 'high',
      reviewStatus: 'completed',
      reviewMode: 'actual',
      timestamp: '30 Okt 2026, 14.20 WITA',
      findings: 'Koridor kepulauan Flores Timur; penyeberangan laut terdata pada sistem rujukan.',
      isNewPriority: false,
      region: 'Kab. Flores Timur',
      fromName: 'Puskesmas Larantuka',
      toName: 'RSUD dr. Hendrikus Fernandez',
      altName: 'RS Pratama Adonara',
    },
  };

  const defaultReports: Record<string, AgentReport> = {
    'RPT-EP-001': {
      id: 'RPT-EP-001',
      episodeId: 'EP-001',
      title: 'Laporan Penelaahan Spasial Episode EP-001',
      createdAt: '30 Okt 2026, 16.30 WITA',
      initialIndex: 84.5,
      initialCategory: 'high',
      fromName: 'Puskesmas Wolomarang',
      toName: 'RSUD Dr. T.C. Hillers',
      altName: 'Klinik Pratama St. Elisabeth',
      proxyDistanceKm: 14.2,
      timeRatio: 1.65,
      summary: 'Episode rujukan dari Puskesmas Wolomarang menuju RSUD Dr. T.C. Hillers memiliki indeks risiko 84.5/100. Analisis penginderaan jauh mendeteksi genangan banjir pesisir yang menghambat akses koridor normal, mengonfirmasi urgensi rute alternatif.',
      recommendations: [
        'Verifikasi alasan klinis dan riwayat cuaca/akses faskes pada tanggal rujukan.',
        'Pertahankan status rujukan terkonfirmasi dengan justifikasi bencana hidrometeorologi.',
        'Gunakan citra satelit resolusi tinggi sebagai lampiran bukti klarifikasi.',
      ],
      evidenceFileName: '01_NTT-01_banjir_A_v4.png',
      evidenceImageUrl: getNeonGeoAIImagePath('01_NTT-01_banjir_A_v4.png'),
      isSimulation: false,
    },
    'RPT-EP-002': {
      id: 'RPT-EP-002',
      episodeId: 'EP-002',
      title: 'Laporan Penelaahan Spasial Episode EP-002',
      createdAt: '30 Okt 2026, 16.15 WITA',
      initialIndex: 88.0,
      initialCategory: 'high',
      fromName: 'Puskesmas Oesao',
      toName: 'RSUD Prof. W.Z. Johannes',
      altName: 'RS Tingkat IV Wirasakti',
      proxyDistanceKm: 32.8,
      timeRatio: 1.85,
      summary: 'Episode rujukan dari Puskesmas Oesao menuju RSUD Prof. W.Z. Johannes memiliki indeks risiko 88.0/100. Terdapat faskes alternatif terdekat yang layak dengan rasio waktu proksi 1.85x.',
      recommendations: [
        'Konfirmasi ketersediaan tempat tidur dan dokter spesialis di RS rujukan alternatif.',
        'Minta klarifikasi faskes perujuk mengenai alasan bypass rujukan primer.',
        'Sampaikan rekomendasi review berkas klaim ke tim verifikator cabang Kupang.',
      ],
      evidenceFileName: '05_NTT-04_longsor_A_v4.png',
      evidenceImageUrl: getNeonGeoAIImagePath('05_NTT-04_longsor_A_v4.png'),
      isSimulation: false,
    },
    'RPT-EP-003': {
      id: 'RPT-EP-003',
      episodeId: 'EP-003',
      title: 'Laporan Penelaahan Spasial Episode EP-003',
      createdAt: '30 Okt 2026, 15.45 WITA',
      initialIndex: 79.2,
      initialCategory: 'high',
      fromName: 'Puskesmas Labuan Bajo',
      toName: 'RS Siloam Labuan Bajo',
      altName: 'RSUD Komodo',
      proxyDistanceKm: 18.5,
      timeRatio: 1.25,
      summary: 'Episode rujukan Labuan Bajo menunjukkan kecocokan topografi dengan kondisi perbukitan pulau Flores. Tidak ditemukan anomali rute yang signifikan.',
      recommendations: [
        'Klaim memenuhi indikator kewajaran transportasi dan keterjangkauan spasial.',
        'Arsipkan berkas telaah ke repositori hasil verifikasi otomatis.',
      ],
      evidenceFileName: '03_NTT-03_banjir_A_v4.png',
      evidenceImageUrl: getNeonGeoAIImagePath('03_NTT-03_banjir_A_v4.png'),
      isSimulation: false,
    },
  };

  const defaultNotifications: AgentNotification[] = [
    {
      id: 'NOTIF-001',
      episodeId: 'EP-001',
      recipientRole: 'Tim Monev BPJS Cabang Maumere',
      channel: 'Sistem Monitoring Klaim BPJS Kesehatan',
      status: 'sent',
      subject: 'Hasil Penelaahan Spasial Otomatis: Episode EP-001 (Sikka)',
      body: 'GeoAI Agent telah selesai menelaah koridor rujukan Puskesmas Wolomarang menuju RSUD Dr. T.C. Hillers (Indeks 84.5). Bukti spasial dan dokumen telaah telah diterbitkan.',
      createdAt: '30 Okt 2026, 16.30 WITA',
    },
    {
      id: 'NOTIF-002',
      episodeId: 'EP-002',
      recipientRole: 'Tim Verifikasi Cabang Kupang',
      channel: 'Portal Verifikasi Klaim BPJS Kesehatan',
      status: 'sent',
      subject: 'Perhatian: Episode Prioritas Baru EP-002 Memerlukan Konfirmasi Klinis',
      body: 'Deteksi anomali bypass rujukan dengan rasio waktu proksi 1.85x pada koridor Oesao - Kupang. Silakan tinjau berkas laporan telaah.',
      createdAt: '30 Okt 2026, 16.15 WITA',
    },
    {
      id: 'NOTIF-003',
      episodeId: 'EP-004',
      recipientRole: 'Dinas Kesehatan Kab. Belu',
      channel: 'Sistem Informasi Rujukan Terintegrasi (SISRUTE)',
      status: 'simulated_queue',
      subject: 'Rekapitulasi Keterjangkauan Faskes Perbatasan Belu (Otomatis)',
      body: 'Analisis keterjangkauan faskes wilayah perbatasan Belu telah diperbarui dengan data jaringan jalan terkini.',
      createdAt: '30 Okt 2026, 15.10 WITA',
    },
  ];

  const defaultLogs: AgentActivityLog[] = [
    {
      id: 'LOG-001',
      timestamp: '30 Okt 2026, 18.00 WITA',
      stepName: 'Siklus Otomatis Selesai',
      episodeId: 'NTT-BATCH-AUTO',
      mode: 'actual',
      status: 'completed',
      detail: 'Siklus analisis berkala GeoAI selesai. Evaluasi 364 episode berisiko tinggi di 22 kabupaten/kota NTT.',
    },
    {
      id: 'LOG-002',
      timestamp: '30 Okt 2026, 17.55 WITA',
      stepName: 'Penilaian Rasio Waktu Proksi',
      episodeId: 'NTT-BATCH-AUTO',
      mode: 'actual',
      status: 'completed',
      detail: 'Kalkulasi jarak tempuh jaringan jalan dan rasio faskes alternatif terdekat selesai diperbarui.',
    },
    {
      id: 'LOG-003',
      timestamp: '30 Okt 2026, 17.50 WITA',
      stepName: 'Pengambilan Citra Satelit & DEM',
      episodeId: 'NTT-BATCH-AUTO',
      mode: 'actual',
      status: 'completed',
      detail: 'Sinkronisasi layer penginderaan jauh dari Neon Object Storage berhasil untuk seluruh koridor prioritas.',
    },
    {
      id: 'LOG-004',
      timestamp: '30 Okt 2026, 17.45 WITA',
      stepName: 'Penerbitan Laporan & Notifikasi',
      episodeId: 'NTT-BATCH-AUTO',
      mode: 'actual',
      status: 'completed',
      detail: 'Total 402 laporan ringkas tersedia (+171 hari ini), 289 notifikasi tersampaikan ke stakeholder terkait.',
    },
    {
      id: 'LOG-005',
      timestamp: '30 Okt 2026, 16.30 WITA',
      stepName: 'Deteksi Prioritas Baru',
      episodeId: 'EP-001',
      mode: 'actual',
      status: 'completed',
      detail: 'Identifikasi anomali cuaca hidrometeorologi Sikka; laporan RPT-EP-001 diterbitkan secara otomatis.',
    },
  ];

  return {
    version: '3.0.0',
    systemStatus: 'ready',
    lastRunTimestamp: '2 jam lalu',
    baselineTimestamp: '30 Okt 2026, 16.00 WITA',
    nextRunCountdown: '22j 10m',
    stats: {
      episodesReviewed: 364,
      episodesReviewedToday: 18,
      priorityFindings: 24,
      criticalNew: 1,
      reportsGenerated: 402,
      reportsToday: 171,
      stakeholdersNotified: 289,
      notificationsPending: 48,
    },
    reviewedEpisodes: defaultReviewed,
    reports: defaultReports,
    logs: defaultLogs,
    notifications: defaultNotifications,
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
    if (parsed && parsed.version === '3.0.0' && parsed.stats && parsed.reviewedEpisodes && parsed.reports) {
      return parsed as AgentActivityState;
    }
  } catch {
    // If JSON corrupted, return initial state
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
    isSimulation: false,
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
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const updatedReviewed = { ...updated.reviewedEpisodes };
  const updatedReports = { ...updated.reports };
  const newLogs: AgentActivityLog[] = [...updated.logs];

  targetEpisodes.forEach((ep, idx) => {
    const isNew = idx === 0;
    const record: ReviewedEpisodeRecord = {
      episodeId: ep.id,
      initialIndex: ep.fraudIdx,
      initialCategory: 'high',
      eligibility: 'eligible',
      eligibilityReason: 'Indeks awal tinggi (>60) — memenuhi ambang prioritas penelaahan GeoAI.',
      reviewedIndex: ep.fraudIdx,
      reviewedCategory: 'high',
      reviewStatus: 'completed',
      reviewMode: 'actual',
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

    if (!updatedReports[ep.id]) {
      updatedReports[ep.id] = createEpisodeReport(ep, record);
    }

    newLogs.unshift({
      id: `LOG-${ep.id}-${Date.now()}`,
      timestamp: timestampStr,
      stepName: 'Penelaahan Selesai',
      episodeId: ep.id,
      mode: 'actual',
      status: 'completed',
      detail: `Selesai menelaah koridor ${ep.fromName} → ${ep.toName}. Status: ${isNew ? 'Prioritas Baru' : 'Selesai'}`,
    });
  });

  const trimmedLogs = newLogs.slice(0, 30);

  const finalState: AgentActivityState = {
    ...updated,
    systemStatus: 'ready',
    lastRunTimestamp: timestampStr,
    baselineTimestamp: updated.baselineTimestamp || timestampStr,
    reviewedEpisodes: updatedReviewed,
    reports: updatedReports,
    logs: trimmedLogs,
  };

  saveAgentState(finalState);
  return finalState;
}
