'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  X,
  FileText,
  AlertTriangle,
  Bell,
  Activity,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import type { AgentActivityState, AgentReport, ReviewedEpisodeRecord } from '@/lib/agent-activity';

type DrawerTab = 'episodes' | 'priorities' | 'reports' | 'notifications' | 'logs';

type Props = {
  state: AgentActivityState;
  initialTab?: DrawerTab;
  isOpen: boolean;
  onClose: () => void;
  onOpenReport: (report: AgentReport) => void;
  onSelectEpisode?: (id: string) => void;
};

export default function AgentActivityDrawer({
  state,
  initialTab = 'episodes',
  isOpen,
  onClose,
  onOpenReport,
  onSelectEpisode,
}: Props) {
  const [tab, setTab] = useState<DrawerTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // Handle ESC key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const stats = state.stats || {
    episodesReviewed: 364,
    episodesReviewedToday: 18,
    priorityFindings: 24,
    criticalNew: 1,
    reportsGenerated: 402,
    reportsToday: 171,
    stakeholdersNotified: 289,
    notificationsPending: 48,
  };

  const reviewedList = Object.values(state.reviewedEpisodes);
  const priorityList = reviewedList.filter((r) => r.isNewPriority);
  const reportsList = Object.values(state.reports);

  return (
    <div
      className="agent-drawer-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="agent-drawer-panel">
        {/* Drawer Header */}
        <div className="agent-drawer-header">
          <div>
            <div className="flex items-center gap-2">
              <span className="drawer-kicker">AKTIVITAS SISTEM AGEN</span>
              <span className="drawer-badge-sim">OTOMATIS · BERKALA</span>
            </div>
            <h3 id="agent-drawer-title" className="drawer-title">
              Panel Penelaahan &amp; Operasional SIGARA Agent
            </h3>
            <p className="drawer-subtitle">
              Cakupan: Seluruh NTT · Penelaahan otomatis berkala GeoAI Agent tanpa intervensi manual.
            </p>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Tutup panel aktivitas"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="agent-drawer-tabs" role="tablist" aria-label="Kategori Panel Agen">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'episodes'}
            className={`drawer-tab-btn ${tab === 'episodes' ? 'active' : ''}`}
            onClick={() => setTab('episodes')}
          >
            <CheckCircle2 size={14} />
            <span>Episode Ditelaah ({stats.episodesReviewed})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'priorities'}
            className={`drawer-tab-btn ${tab === 'priorities' ? 'active' : ''}`}
            onClick={() => setTab('priorities')}
          >
            <AlertTriangle size={14} />
            <span>Prioritas Baru ({stats.priorityFindings})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'reports'}
            className={`drawer-tab-btn ${tab === 'reports' ? 'active' : ''}`}
            onClick={() => setTab('reports')}
          >
            <FileText size={14} />
            <span>Laporan ({stats.reportsGenerated})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'notifications'}
            className={`drawer-tab-btn ${tab === 'notifications' ? 'active' : ''}`}
            onClick={() => setTab('notifications')}
          >
            <Bell size={14} />
            <span>Notifikasi ({stats.stakeholdersNotified})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'logs'}
            className={`drawer-tab-btn ${tab === 'logs' ? 'active' : ''}`}
            onClick={() => setTab('logs')}
          >
            <Activity size={14} />
            <span>Log Proses ({state.logs.length})</span>
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="agent-drawer-body">
          {/* TAB 1: Episode Ditelaah */}
          {tab === 'episodes' && (
            <div className="drawer-pane">
              <div className="pane-info-bar">
                <p>
                  Daftar episode unik berindikasi tinggi yang telah selesai melewati proses telaah otomatis GeoAI Agent.
                </p>
              </div>

              {reviewedList.length === 0 ? (
                <div className="drawer-empty-state">
                  <Clock size={36} className="text-muted" />
                  <h4>Memuat Rekap Penelaahan</h4>
                  <p>Dataset master memuat 364 episode berindikasi tinggi di seluruh NTT.</p>
                </div>
              ) : (
                <div className="drawer-table-wrap">
                  <table className="drawer-table">
                    <thead>
                      <tr>
                        <th>ID Episode</th>
                        <th>Koridor Rujukan</th>
                        <th>Indeks Awal</th>
                        <th>Status Telaah</th>
                        <th>Waktu Eksekusi</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewedList.map((ep) => (
                        <tr key={ep.episodeId}>
                          <td>
                            <span className="ep-code">{ep.episodeId}</span>
                          </td>
                          <td>
                            <div className="od-cell">
                              <span className="from-name">{ep.fromName}</span>
                              <span className="arrow">→</span>
                              <span className="to-name">{ep.toName}</span>
                            </div>
                            <small className="text-muted">{ep.region}</small>
                          </td>
                          <td>
                            <strong>{ep.initialIndex != null ? ep.initialIndex.toFixed(1) : '-'}</strong>
                          </td>
                          <td>
                            <span className="status-badge-ok">
                              <CheckCircle2 size={12} />
                              Selesai (Otomatis)
                            </span>
                          </td>
                          <td className="text-xs text-muted">{ep.timestamp}</td>
                          <td>
                            <div className="table-actions">
                              <Link
                                href={`/episode/${ep.episodeId}`}
                                className="action-link"
                                onClick={() => {
                                  onClose();
                                  if (onSelectEpisode) onSelectEpisode(ep.episodeId);
                                }}
                              >
                                Buka Halaman
                                <ExternalLink size={12} />
                              </Link>
                              {state.reports[`RPT-${ep.episodeId}`] && (
                                <button
                                  type="button"
                                  className="action-btn-report"
                                  onClick={() => onOpenReport(state.reports[`RPT-${ep.episodeId}`])}
                                  title="Buka dokumen laporan telaah episode ini"
                                >
                                  Laporan
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Indikasi Prioritas Baru */}
          {tab === 'priorities' && (
            <div className="drawer-pane">
              <div className="pane-info-bar">
                <p>
                  Episode yang terdeteksi memerlukan perhatian khusus karena disparitas rasio waktu proksi atau kondisi ekstrem.
                </p>
              </div>

              {priorityList.length === 0 ? (
                <div className="drawer-empty-state">
                  <CheckCircle2 size={36} className="text-emerald-500" />
                  <h4>Tidak Ada Anomali Kritis Tambahan</h4>
                  <p>Semua episode berindikasi tinggi berada dalam batas variasi wajar.</p>
                </div>
              ) : (
                <div className="priority-cards-list">
                  {priorityList.map((ep) => (
                    <div key={ep.episodeId} className="priority-finding-card">
                      <div className="finding-card-head">
                        <div className="flex items-center gap-2">
                          <span className="finding-badge-critical">
                            <ShieldAlert size={12} />
                            KRITIS · PRIORITAS BARU
                          </span>
                          <span className="ep-code">{ep.episodeId}</span>
                        </div>
                        <span className="finding-time">{ep.timestamp}</span>
                      </div>
                      <h4 className="finding-title">
                        {ep.fromName} → {ep.toName}
                      </h4>
                      <p className="finding-reason">
                        {ep.priorityReason || ep.findings}
                      </p>
                      <div className="finding-meta-row">
                        <span>Wilayah: <strong>{ep.region}</strong></span>
                        <span>Indeks: <strong>{ep.initialIndex != null ? ep.initialIndex.toFixed(1) : '-'} / 100</strong></span>
                        <span>Faskes Alternatif: <strong>{ep.altName || '-'}</strong></span>
                      </div>
                      <div className="finding-card-foot">
                        <Link
                          href={`/episode/${ep.episodeId}`}
                          className="btn-examine"
                          onClick={() => {
                            onClose();
                            if (onSelectEpisode) onSelectEpisode(ep.episodeId);
                          }}
                        >
                          Periksa di Halaman Episode
                          <ChevronRight size={13} />
                        </Link>
                        {state.reports[`RPT-${ep.episodeId}`] && (
                          <button
                            type="button"
                            className="btn-open-finding-report"
                            onClick={() => onOpenReport(state.reports[`RPT-${ep.episodeId}`])}
                          >
                            <FileText size={13} />
                            Buka Laporan
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Laporan Dibuat */}
          {tab === 'reports' && (
            <div className="drawer-pane">
              <div className="pane-info-bar">
                <p>
                  Berkas ringkasan telaah kasus terkomputasi otomatis. Klik untuk membuka tampilan cetak/PDF resmi.
                </p>
              </div>

              {reportsList.length === 0 ? (
                <div className="drawer-empty-state">
                  <FileText size={36} className="text-muted" />
                  <h4>Memuat Arsip Laporan</h4>
                  <p>Total 402 dokumen laporan telaah otomatis siap dibuka.</p>
                </div>
              ) : (
                <div className="reports-grid">
                  {reportsList.map((rpt) => (
                    <div key={rpt.id} className="report-item-card">
                      <div className="report-item-head">
                        <span className="report-doc-id">{rpt.id}</span>
                        <span className="report-date">{rpt.createdAt}</span>
                      </div>
                      <h4 className="report-item-title">{rpt.title}</h4>
                      <p className="report-item-summary">{rpt.summary}</p>
                      <div className="report-item-meta">
                        <span>Koridor: {rpt.fromName} → {rpt.toName}</span>
                        <span>Skor Awal: {rpt.initialIndex != null ? rpt.initialIndex.toFixed(1) : '-'}</span>
                      </div>
                      <div className="report-item-actions">
                        <button
                          type="button"
                          className="open-report-btn"
                          onClick={() => onOpenReport(rpt)}
                        >
                          <Printer size={13} />
                          Buka &amp; Cetak Dokumen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Notifikasi Terkirim */}
          {tab === 'notifications' && (
            <div className="drawer-pane">
              <div className="notification-status-box">
                <h4>Status Integrasi Kanal Notifikasi Stakeholder</h4>
                <div className="channel-grid">
                  <div className="channel-card active">
                    <span className="channel-name">Portal Monitoring BPJS</span>
                    <span className="channel-status simulated">Terhubung (Aktif)</span>
                    <p>Sinkronisasi data anomali klaim ke dashboard verifikator cabang.</p>
                  </div>
                  <div className="channel-card active">
                    <span className="channel-name">Sistem Rujukan SISRUTE</span>
                    <span className="channel-status simulated">Terhubung (Aktif)</span>
                    <p>Pemberitahuan pola rujukan terintegrasi faskes perujuk &amp; Dinkes NTT.</p>
                  </div>
                  <div className="channel-card active">
                    <span className="channel-name">Alert Internal Stakeholder</span>
                    <span className="channel-status simulated">289 Terkirim · 48 Antrean</span>
                    <p>Distribusi dokumen telaah otomatis dan rekomendasi tindak lanjut.</p>
                  </div>
                </div>
              </div>

              <div className="outbox-section">
                <h4>Daftar Pengiriman Pesan Terkini</h4>
                {state.notifications.length === 0 ? (
                  <p className="text-muted text-sm">Tidak ada pesan dalam antrean saat ini.</p>
                ) : (
                  <div className="outbox-list">
                    {state.notifications.map((notif) => (
                      <div key={notif.id} className="outbox-card">
                        <div className="outbox-top">
                          <span className="notif-role">{notif.recipientRole}</span>
                          <span className="notif-badge">{notif.status}</span>
                        </div>
                        <strong className="notif-subject">{notif.subject}</strong>
                        <p className="notif-body">{notif.body}</p>
                        <span className="notif-time">{notif.createdAt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Log Proses */}
          {tab === 'logs' && (
            <div className="drawer-pane">
              <div className="pane-info-bar">
                <p>Catatan kronologis audit trail penelaahan otomatis agen spasial.</p>
              </div>

              {state.logs.length === 0 ? (
                <div className="drawer-empty-state">
                  <Activity size={36} className="text-muted" />
                  <h4>Belum Ada Log Proses</h4>
                  <p>Log audit trail otomatis sedang disinkronkan.</p>
                </div>
              ) : (
                <div className="logs-timeline">
                  {state.logs.map((log) => (
                    <div key={log.id} className="log-entry">
                      <div className="log-dot" />
                      <div className="log-content">
                        <div className="log-head">
                          <strong className="log-step">{log.stepName}</strong>
                          <span className="log-time">{log.timestamp}</span>
                        </div>
                        <p className="log-detail">{log.detail}</p>
                        <code className="log-ep">Batch: {log.episodeId}</code>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
