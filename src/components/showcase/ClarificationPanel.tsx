'use client';
import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  FastForward,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Info,
  Calendar,
} from 'lucide-react';
import type { Episode } from '@/lib/showcase';
import { getEpisodeEligibility, type AgentReport } from '@/lib/agent-activity';
import type {
  ClarificationCase,
  FixtureId,
  ClosureReason,
} from '@/lib/clarification-demo-types';
import {
  simulateSendDraft,
  simulateReceiveReply,
  simulateAgentInquiryReply,
  simulateSendFollowup,
  closeCase,
  getCaseForEpisode,
  deleteClarificationCase,
  formatSimDateTime,
} from '@/lib/clarification-demo';
import { startDemo, persistCase, advanceDemoClock, getDemoClock } from '@/lib/clarification-store';
import { loadAgentState } from '@/lib/agent-activity';
import { demoStorageAvailable, readDemoStorage, removeLegacyDemoStorage } from '@/lib/demo-storage';
import { useDemoDialog } from './useDemoDialog';
import ClarificationThread from './ClarificationThread';
import ReportViewerModal from './ReportViewerModal';

type Props = {
  episode: Episode;
};

export default function ClarificationPanel({ episode }: Props) {
  const eligibility = getEpisodeEligibility(episode);

  const [currentCase, setCurrentCase] = useState<ClarificationCase | null>(null);
  const [legacy, setLegacy] = useState(false);
  const [temporary, setTemporary] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState<FixtureId>('complete');
  const [activeReport, setActiveReport] = useState<AgentReport | null>(null);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closureReason, setClosureReason] = useState<ClosureReason>('sufficient');
  const [closureNotes, setClosureNotes] = useState('');

  const closureRef = useDemoDialog(isClosingModalOpen, () => setIsClosingModalOpen(false));

  // Load existing case on mount or episode change
  useEffect(() => {
    const sync = () => { setCurrentCase(getCaseForEpisode(episode.id)); setTemporary(!demoStorageAvailable()); setLegacy(Boolean(readDemoStorage('sigara-agent-activity-v3'))); };
    sync();
    window.addEventListener('sigara-demo-change', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('sigara-demo-change', sync); window.removeEventListener('storage', sync); };
  }, [episode.id]);

  // Persist case update and sync state
  const updateAndSaveCase = (updated: ClarificationCase) => {
    setCurrentCase(updated);
    persistCase(updated);
  };

  // Skip rendering panel for low/medium episodes
  if (eligibility.eligibility !== 'eligible') {
    return (
      <section className="clarification-panel-section skipped" aria-label="Status Klarifikasi Dua Arah">
        <div className="clarification-skip-box">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-muted" />
            <strong>Klarifikasi &amp; Tindak Lanjut [Simulasi POC]</strong>
            <span className="badge-skipped">Tidak Dipicu</span>
          </div>
          <p>
            Alur simulasi klarifikasi dua arah dibatasi untuk episode berindikasi tinggi. Episode ini memiliki
            indeks awal {eligibility.initialIndex != null ? eligibility.initialIndex.toFixed(1) : '-'} / 100 ({eligibility.initialCategory}),
            sehingga tidak memerlukan pembukaan kasus klarifikasi rujukan.
          </p>
        </div>
      </section>
    );
  }

  // Handle Starting a new demo case
  const handleStartDemo = () => {
    setCurrentCase(startDemo(episode, selectedFixture));
  };

  // Handle Send Draft
  const handleSendDraft = () => {
    if (!currentCase) return;
    const updated = simulateSendDraft(getCaseForEpisode(episode.id) || currentCase);
    updateAndSaveCase(updated);
  };

  // Handle Receive Reply
  const handleReceiveReply = () => {
    if (!currentCase) return;
    const updated = simulateReceiveReply(getCaseForEpisode(episode.id) || currentCase, episode);
    updateAndSaveCase(updated);
  };

  // Handle Agent inquiry response (Alur 2)
  const handleAgentInquiryReply = () => {
    if (!currentCase) return;
    const updated = simulateAgentInquiryReply(currentCase, episode);
    updateAndSaveCase(updated);
  };

  // Handle Send Follow-up Request (Alur 2)
  const handleSendFollowup = () => {
    if (!currentCase) return;
    const updated = simulateSendFollowup(currentCase, episode);
    updateAndSaveCase(updated);
  };

  // Handle Advance Time by 1 Day
  const handleAdvanceOneDay = () => {
    if (!currentCase) return;
    advanceDemoClock(1);
  };

  // Handle Advance to Next Due Date
  const handleAdvanceToNextDue = () => {
    if (!currentCase) return;
    if (currentCase.dueAt) advanceDemoClock(Math.max(0.001, (Date.parse(currentCase.dueAt) - Date.parse(getDemoClock())) / 86400000));
  };

  // Handle Confirm Closure
  const handleConfirmClosure = () => {
    if (!currentCase) return;
    if (!closureNotes.trim()) return;
    const updated = closeCase(currentCase, closureReason, closureNotes);
    updateAndSaveCase(updated);
    setIsClosingModalOpen(false);
  };

  // Handle Reset Case
  const handleResetCase = () => {
    if (!currentCase) return;
    if (window.confirm('Reset demo kasus klarifikasi untuk episode ini ke draf awal?')) {
      deleteClarificationCase(episode.id);
      setCurrentCase(null);
    }
  };

  // Open attached report in modal
  const handleOpenReportById = (rptId: string) => {
    const rpt = loadAgentState().reports[rptId];
    if (rpt) setActiveReport(rpt);
  };

  return (
    <section className="clarification-panel-section" id="klarifikasi" aria-label="Klarifikasi & Tindak Lanjut Dua Arah" aria-live="polite">
      {/* Section Header */}
      <div className="clarification-panel-header">
        <div className="header-left">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-emerald-400" />
            <h3 className="section-title">Klarifikasi &amp; Tindak Lanjut Dua Arah</h3>
            <span className="badge-sim-poc">SIMULASI POC</span>
          </div>
          <p className="section-desc">
            Siklus responsif per episode: surat penjelasan resmi, jawaban stakeholder faskes, evaluasi kelengkapan oleh agen, dan penutupan oleh petugas.
          </p>
        </div>
      </div>

      {temporary && <p role="status">Penyimpanan browser tidak tersedia: demo berjalan sementara dan hilang setelah refresh.</p>}
      {legacy && <p className="text-muted">Riwayat demo versi lama disimpan terpisah dan tidak dihitung sebagai aktivitas. Demo baru dimulai dari nol. <button type="button" onClick={() => { if (window.confirm('Hapus hanya riwayat demo agen versi lama (v3)? Kasus dan laporan demo baru tetap tersimpan.')) removeLegacyDemoStorage(); }}>Hapus riwayat demo lama</button></p>}
      {/* STATE 1: Belum Ada Kasus -> Pilihan Alur & Mulai Demo */}
      {!currentCase ? (
        <div className="clarification-unstarted-card">
          <div className="unstarted-head">
            <Sparkles size={20} className="text-emerald-400" />
            <div>
              <h4>Belum Ada Kasus Klarifikasi</h4>
              <p>Pilih salah satu alur simulasi demonstrasi untuk memulai penelaahan interaktif pada episode rujukan ini.</p>
            </div>
          </div>

          <div className="fixture-selector-grid">
            <button
              type="button"
              className={`fixture-choice-btn ${selectedFixture === 'complete' ? 'selected' : ''}`}
              onClick={() => setSelectedFixture('complete')}
            >
              <div className="choice-top">
                <span className="choice-number">Alur 1</span>
                <span className="choice-tag tag-complete">Jawaban Lengkap</span>
              </div>
              <strong>Klarifikasi Langsung Memadai</strong>
              <p>Faskes menjawab lengkap kendala klinis &amp; cuaca lokal. Agen merangkum informasi dan kasus siap ditinjau petugas.</p>
            </button>

            <button
              type="button"
              className={`fixture-choice-btn ${selectedFixture === 'followup' ? 'selected' : ''}`}
              onClick={() => setSelectedFixture('followup')}
            >
              <div className="choice-top">
                <span className="choice-number">Alur 2</span>
                <span className="choice-tag tag-followup">Tanya-Jawab Bertahap</span>
              </div>
              <strong>Pertanyaan &amp; Penjelasan Lanjutan</strong>
              <p>Faskes meminta konfirmasi faskes pembanding, agen menjawab otomatis, faskes melengkapi, lalu putaran pertanyaan lanjutan.</p>
            </button>

            <button
              type="button"
              className={`fixture-choice-btn ${selectedFixture === 'no_response' ? 'selected' : ''}`}
              onClick={() => setSelectedFixture('no_response')}
            >
              <div className="choice-top">
                <span className="choice-number">Alur 3</span>
                <span className="choice-tag tag-reminder">Tanpa Tanggapan</span>
              </div>
              <strong>Pengingat Otomatis &amp; Eskalasi</strong>
              <p>Waktu simulasi dimajukan: Agen menerbitkan Pengingat 1 &amp; 2, eskalasi petugas, atau balasan terlambat diterima.</p>
            </button>
          </div>

          <div className="unstarted-action-row">
            <button
              type="button"
              className="btn-start-clarification"
              onClick={handleStartDemo}
            >
              <Send size={15} />
              <span>Buat Laporan & Mulai Demo Klarifikasi Kasus Ini</span>
            </button>
          </div>
        </div>
      ) : (
        /* STATE 2: Kasus Aktif -> Header Status, Thread, Rangkuman & Aksi */
        <div className="clarification-active-container">
          {/* Case Metadata Bar */}
          <div className="case-status-bar">
            <div className="case-info-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="case-id-badge">{currentCase.id}</span>
                <span className={`case-status-badge status-${currentCase.status}`}>
                  {currentCase.status === 'draft' && 'Draf Surat Disiapkan'}
                  {currentCase.status === 'awaiting_response' && 'Menunggu Balasan Faskes'}
                  {currentCase.status === 'response_received' && 'Balasan Diterima'}
                  {currentCase.status === 'followup_required' && 'Perlu Pertanyaan Lanjutan'}
                  {currentCase.status === 'ready_for_review' && 'Siap Ditinjau Petugas'}
                  {currentCase.status === 'escalated' && 'Perlu Tindak Lanjut Petugas'}
                  {currentCase.status === 'closed' && 'Kasus Selesai Ditelaah'}
                </span>
                <span className="fixture-badge">
                  Alur: {currentCase.fixtureId === 'complete' ? 'Jawaban Lengkap' : currentCase.fixtureId === 'followup' ? 'Tanya-Jawab Bertahap' : 'Pengingat & Eskalasi'}
                </span>
              </div>

              <div className="case-parties-row">
                <span>Pihak Pengirim: <strong>petugas.sigara@example.com</strong></span>
                <span className="sep">↔</span>
                <span>Kontak Faskes: <strong>kontak.faskes@example.com</strong> ({episode.fromName})</span>
              </div>
            </div>

            <div className="case-clock-col">
              <div className="clock-item">
                <Clock size={13} className="text-sky-400" />
                <span>Waktu Demo: <strong>{formatSimDateTime(currentCase.simulationClock)}</strong></span>
              </div>
              {currentCase.dueAt && currentCase.status === 'awaiting_response' && (
                <div className="due-item">
                  <Calendar size={13} className="text-amber-400" />
                  <span>Tenggat: <strong>{formatSimDateTime(currentCase.dueAt)}</strong> (Pengingat: {currentCase.reminderCount}/{currentCase.maxReminders})</span>
                </div>
              )}
            </div>
          </div>

          {/* Contextual Action Controls Bar */}
          <div className="case-actions-toolbar" role="region" aria-label="Kontrol Aksi Simulasi">
            <span className="toolbar-label">Langkah berikutnya: gunakan aksi sesuai status kasus.</span>
            <button type="button" onClick={() => { const reports = Object.values(loadAgentState().reports).filter(r => r.episodeId === episode.id).sort((a, b) => (b.revision || 0) - (a.revision || 0)); if (reports[0]) setActiveReport(reports[0]); }}>Buka Laporan Klarifikasi Terbaru</button>

            {/* If Draft */}
            {currentCase.status === 'draft' && (
              <button
                type="button"
                className="btn-demo-action primary"
                onClick={handleSendDraft}
              >
                <Send size={14} />
                <span>Simulasikan Pengiriman Permintaan</span>
              </button>
            )}

            {/* If Awaiting Response */}
            {currentCase.status === 'awaiting_response' && (
              <>
                <button
                  type="button"
                  className="btn-demo-action primary"
                  onClick={handleReceiveReply}
                >
                  <MessageSquare size={14} />
                  <span>{currentCase.fixtureId === 'no_response' ? 'Simulasikan Balasan Terlambat' : 'Simulasikan Balasan Faskes'}</span>
                </button>
                <button
                  type="button"
                  className="btn-demo-action secondary"
                  onClick={handleAdvanceOneDay}
                  title="Majukan waktu simulasi sebanyak 1 hari"
                >
                  <FastForward size={14} />
                  <span>Majukan 1 Hari</span>
                </button>
                <button
                  type="button"
                  className="btn-demo-action secondary"
                  onClick={handleAdvanceToNextDue}
                  title="Majukan waktu simulasi langsung ke tenggat (+2 hari)"
                >
                  <FastForward size={14} />
                  <span>Majukan ke Tenggat Berikutnya</span>
                </button>
              </>
            )}

            {/* If Response Received & asking question in Flow 2 */}
            {currentCase.status === 'response_received' && currentCase.fixtureId === 'followup' && (
              <button
                type="button"
                className="btn-demo-action primary"
                onClick={handleAgentInquiryReply}
              >
                <Send size={14} />
                <span>Jawab Pertanyaan Faskes (Simulasi Agen)</span>
              </button>
            )}

            {/* If Follow-up Required in Flow 2 */}
            {currentCase.status === 'followup_required' && (
              <button
                type="button"
                className="btn-demo-action primary"
                onClick={handleSendFollowup}
              >
                <Send size={14} />
                <span>Kirim Pertanyaan Lanjutan (Putaran ke-2)</span>
              </button>
            )}

            {/* If Escalated in Flow 3 */}
            {currentCase.status === 'escalated' && (
              <>
                <button
                  type="button"
                  className="btn-demo-action secondary"
                  onClick={handleReceiveReply}
                  title="Simulasikan faskes mengirim balasan terlambat"
                >
                  <MessageSquare size={14} />
                  <span>Simulasikan Balasan Terlambat</span>
                </button>
                <button
                  type="button"
                  className="btn-demo-action primary"
                  onClick={() => { setClosureNotes(''); setIsClosingModalOpen(true); }}
                >
                  <UserCheck size={14} />
                  <span>Tinjau &amp; Tutup Kasus</span>
                </button>
              </>
            )}

            {/* If Ready for Review */}
            {currentCase.status === 'ready_for_review' && (
              <button
                type="button"
                className="btn-demo-action primary"
                onClick={() => setIsClosingModalOpen(true)}
              >
                <UserCheck size={14} />
                <span>Tinjau &amp; Tutup Kasus</span>
              </button>
            )}

            {/* Reset button always available */}
            <button
              type="button"
              className="btn-demo-reset"
              onClick={handleResetCase}
              title="Reset kasus klarifikasi episode ini ke kondisi awal"
            >
              <RotateCcw size={13} />
              <span>Reset Kasus</span>
            </button>
          </div>

          {/* Closure Banner (when closed) */}
          {currentCase.status === 'closed' && (
            <div className="case-closed-banner">
              <CheckCircle2 size={20} className="text-emerald-400" />
              <div>
                <h4>Kasus Klarifikasi Telah Ditutup oleh Petugas</h4>
                <p>
                  <strong>Hasil:</strong>{' '}
                  {currentCase.closureReason === 'sufficient' && 'Klarifikasi cukup untuk arsip demo'}
                  {currentCase.closureReason === 'further_study' && 'Perlu telaah lanjutan lapangan'}
                  {currentCase.closureReason === 'unresponsive_escalated' && 'Belum ada tanggapan; diteruskan ke tim audit/verifikator'}
                </p>
                <p className="closure-notes">
                  <strong>Catatan Petugas:</strong> {currentCase.closureNotes || '-'}
                </p>
                <span className="closure-time">
                  Ditutup pada: {formatSimDateTime(currentCase.closedAt)} oleh {currentCase.closedBy}
                </span>
              </div>
            </div>
          )}

          {/* Two-Way Message Thread */}
          <ClarificationThread
            messages={currentCase.messages}
            events={currentCase.events}
            onOpenReport={handleOpenReportById}
          />

          {/* Agent Summary Box (when summary exists) */}
          {currentCase.summary && (
            <div className="agent-summary-box">
              <div className="summary-box-head">
                <Sparkles size={16} className="text-emerald-400" />
                <h4>Rangkuman Evaluasi Klarifikasi oleh SIGARA Agent</h4>
                <span className="summary-date">{formatSimDateTime(currentCase.summary.updatedAt)}</span>
              </div>

              <div className="summary-grid">
                <div className="summary-col">
                  <strong>1. Pokok Pertanyaan:</strong>
                  <p>{currentCase.summary.questionAsked}</p>
                </div>
                <div className="summary-col">
                  <strong>2. Pernyataan Stakeholder (dummy, belum diverifikasi):</strong>
                  <p>{currentCase.summary.stakeholderResponse}</p>
                </div>
              </div>

              <div className="summary-check-row">
                <div className="check-block">
                  <span className="check-title text-emerald-400">3. Informasi Lengkap:</span>
                  <ul>
                    {currentCase.summary.completeItems.map((item, i) => (
                      <li key={i}>
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="check-block">
                  <span className="check-title text-amber-400">4. Informasi Masih Kurang:</span>
                  {currentCase.summary.missingItems.length === 0 ? (
                    <p className="text-xs text-muted">Tidak ada item yang kurang.</p>
                  ) : (
                    <ul>
                      {currentCase.summary.missingItems.map((item, i) => (
                        <li key={i}>
                          <AlertTriangle size={13} className="text-amber-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="summary-recommendation">
                <strong>5. Rekomendasi Langkah Berikutnya:</strong>
                <p>{currentCase.summary.recommendation}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review & Close Modal Dialog */}
      {isClosingModalOpen && (
        <div className="closure-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="closure-modal-title">
          <div className="closure-modal-card" ref={closureRef}>
            <h3 id="closure-modal-title">Tinjau &amp; Tutup Kasus Klarifikasi</h3>
            <p className="closure-modal-subtitle">
              Selesaikan evaluasi klarifikasi untuk episode {episode.id}. Catatan dan keputusan akan disimpan secara permanen pada penyimpanan demo browser.
            </p>

            <div className="closure-form-group">
              <label htmlFor="closure-reason-select">Keputusan Penelaahan:</label>
              <select
                id="closure-reason-select"
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value as ClosureReason)}
              >
                <option value="sufficient">Klarifikasi cukup untuk arsip demo</option>
                <option value="further_study">Perlu telaah lanjutan lapangan (Pemeriksaan Lanjutan)</option>
                <option value="unresponsive_escalated">Belum ada tanggapan; diteruskan ke tim audit/verifikator</option>
              </select>
            </div>

            <div className="closure-form-group">
              <label htmlFor="closure-notes-textarea">Catatan Penutupan Petugas:</label>
              <textarea
                id="closure-notes-textarea"
                rows={3}
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                placeholder="Masukkan catatan evaluasi dan justifikasi penutupan kasus…"
              />
            </div>

            <div className="closure-modal-actions">
              <button
                type="button"
                className="btn-closure-cancel"
                onClick={() => setIsClosingModalOpen(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-closure-confirm"
                disabled={!closureNotes.trim()}
                onClick={handleConfirmClosure}
              >
                Konfirmasi Penutupan Kasus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Viewer Modal */}
      {activeReport && (
        <ReportViewerModal
          report={activeReport}
          onClose={() => setActiveReport(null)}
        />
      )}
    </section>
  );
}
