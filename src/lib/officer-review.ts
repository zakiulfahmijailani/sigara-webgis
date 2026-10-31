import { createEpisodeReport, type AgentActivityState, type AgentReport } from './agent-activity';
import type { Episode } from './showcase';
import type { ClarificationCase } from './clarification-demo-types';

export const REVIEW_OPTIONS = {
  not_fraud: { label: 'Tidak terindikasi fraud', description: 'Alasan rujukan dapat diterima berdasarkan bukti yang ditelaah.', final: true, followup: 'Arsipkan hasil telaah' },
  clarification: { label: 'Perlu klarifikasi', description: 'Bukti belum cukup. Lengkapi keterangan sebelum mengambil keputusan akhir.', final: false, followup: 'Minta kelengkapan bukti kepada faskes' },
  suspected_fraud: { label: 'Dugaan fraud — lanjut audit', description: 'Ada indikasi yang memerlukan pemeriksaan lebih lanjut oleh tim audit.', final: false, followup: 'Teruskan ke tim audit' },
  confirmed_fraud: { label: 'Fraud terkonfirmasi', description: 'Tetapkan hasil berdasarkan pemeriksaan dan dokumen pendukung petugas.', final: true, followup: 'Tindak lanjuti hasil pemeriksaan' },
} as const;
export type OfficerDecision = keyof typeof REVIEW_OPTIONS;
export const REVIEW_REASONS = ['Kebutuhan klinis pasien', 'Ketersediaan layanan faskes', 'Akses dan kondisi geografis', 'Kesesuaian dokumen rujukan', 'Pola rujukan tidak wajar', 'Hasil klarifikasi atau audit'];
export type OfficerReviewDraft = {
  episodeId: string;
  decision: OfficerDecision | '';
  officerName: string;
  officerRole: string;
  reasons: string[];
  evidence: string;
  notes: string;
  followup: string;
  acknowledged: boolean;
  baseRevision: number;
};
export type OfficerReview = OfficerReviewDraft & {
  decision: OfficerDecision;
  approvedAt: string;
  revision: number;
  status: 'final' | 'followup';
};
export function latestOfficerReport(state: AgentActivityState, episodeId: string): AgentReport | undefined {
  return Object.values(state.reports).filter(r => r.episodeId === episodeId && r.officerReview)
    .sort((a, b) => b.officerReview!.revision - a.officerReview!.revision)[0];
}
export function latestEpisodeReport(state: AgentActivityState, episodeId: string): AgentReport | undefined {
  return latestOfficerReport(state, episodeId) || Object.values(state.reports)
    .filter(r => r.episodeId === episodeId).sort((a, b) => (b.revision || 0) - (a.revision || 0))[0];
}
export function emptyOfficerDraft(episodeId: string): OfficerReviewDraft {
  return { episodeId, decision: '', officerName: '', officerRole: '', reasons: [], evidence: '', notes: '', followup: '', acknowledged: false, baseRevision: 0 };
}
export function reviewValidation(draft: OfficerReviewDraft): string[] {
  const errors: string[] = [];
  if (!Object.hasOwn(REVIEW_OPTIONS, draft.decision)) errors.push('Pilih hasil keputusan.');
  if (!draft.officerName.trim()) errors.push('Isi nama petugas.');
  if (!draft.officerRole.trim()) errors.push('Isi jabatan atau unit petugas.');
  if (!draft.reasons.length || draft.reasons.some(r => !REVIEW_REASONS.includes(r))) errors.push('Pilih dasar pertimbangan.');
  if (!draft.evidence.trim()) errors.push('Cantumkan bukti atau nomor dokumen yang ditelaah.');
  if (!draft.notes.trim()) errors.push('Jelaskan alasan keputusan.');
  if (!draft.followup.trim()) errors.push('Isi tindak lanjut.');
  if (!draft.acknowledged) errors.push('Konfirmasi bahwa bukti sudah ditelaah.');
  return errors;
}

// Publish an immutable report snapshot; later drafts and clarification cannot rewrite it.
export function approveOfficerReview(state: AgentActivityState, episode: Episode, draft: OfficerReviewDraft, clarification?: ClarificationCase, now = new Date().toISOString()) {
  if (draft.episodeId !== episode.id || (clarification && clarification.episodeId !== episode.id)) throw new Error('Episode telaah tidak sesuai.');
  const errors = reviewValidation(draft);
  if (errors.length) throw new Error(errors.join(' '));
  const previous = latestOfficerReport(state, episode.id)?.officerReview?.revision || 0;
  if (draft.baseRevision !== previous) throw new Error('Ada keputusan yang lebih baru. Muat ulang halaman sebelum membuat revisi.');
  const decision = draft.decision as OfficerDecision;
  const review: OfficerReview = { ...structuredClone(draft), decision, officerName: draft.officerName.trim(), officerRole: draft.officerRole.trim(),
    evidence: draft.evidence.trim(), notes: draft.notes.trim(), followup: draft.followup.trim(),
    approvedAt: now, revision: previous + 1, status: REVIEW_OPTIONS[decision].final ? 'final' : 'followup' };
  const report: AgentReport = { ...createEpisodeReport(episode), id: `RPT-${episode.id}-PETUGAS-${review.revision}`,
    title: `${review.status === 'final' ? 'Laporan Akhir' : 'Laporan Telaah Lanjutan'} Episode ${episode.id}`,
    createdAt: now, revision: review.revision, officerReview: review,
    ...(clarification ? { clarification: structuredClone(clarification) } : {}) };
  const officerDrafts = { ...state.officerDrafts };
  delete officerDrafts[episode.id];
  const next: AgentActivityState = { ...state, officerDrafts, reports: { ...state.reports, [report.id]: report } };
  next.stats = { ...state.stats,
    episodesReviewed: new Set([...Object.values(state.reviewedEpisodes).filter(r => r.reviewStatus === 'completed').map(r => r.episodeId), ...Object.values(next.reports).filter(r => r.officerReview).map(r => r.episodeId)]).size,
    reportsGenerated: new Set(Object.values(next.reports).map(r => r.episodeId)).size };
  return { state: next, report };
}
