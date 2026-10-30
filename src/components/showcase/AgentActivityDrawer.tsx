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
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { AgentActivityState, AgentReport, ReviewedEpisodeRecord } from '@/lib/agent-activity';

type DrawerTab = 'episodes' | 'priorities' | 'reports' | 'notifications' | 'logs';

type Props = {
  state: AgentActivityState;
  initialTab?: DrawerTab;
  isOpen: boolean;
  onClose: () => void;
  onOpenReport: (report: AgentReport) => void;
  onRunSimulation?: () => void;
  isSimulating?: boolean;
};

export default function AgentActivityDrawer({
  state,
  initialTab = 'episodes',
  isOpen,
  onClose,
  onOpenReport,
  onRunSimulation,
  isSimulating = false,
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
              <span className="drawer-badge-sim">SIMULASI POC · LOKAL</span>
            </div>
            <h3 id="agent-drawer-title" className="drawer-title">
              Panel Penelaahan &amp; Operasional SIGARA Agent
            </h3>
            <p className="drawer-subtitle">
              Cakupan: Seluruh NTT · Riwayat penelaahan pada sesi percontohan ini.
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
            <span>Episode Ditelaah ({reviewedList.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'priorities'}
            className={`drawer-tab-btn ${tab === 'priorities' ? 'active' : ''}`}
            onClick={() => setTab('priorities')}
          >
            <AlertTriangle size={14} />
            <span>Prioritas Baru ({priorityList.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'reports'}
            className={`drawer-tab-btn ${tab === 'reports' ? 'active' : ''}`}
            onClick={() => setTab('reports')}
          >
            <FileText size={14} />
            <span>Laporan ({reportsList.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'notifications'}
            className={`drawer-tab-btn ${tab === 'notifications' ? 'active' : ''}`}
            onClick={() => setTab('notifications')}
          >
            <Bell size={14} />
            <span>Notifikasi ({state.notifications.length ? 'Outbox' : 'Non-aktif'})</span>
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
                  Daftar episode unik berindikasi tinggi yang telah selesai melewati proses telaah 6 agen spasial.
                </p>
                {onRunSimulation && (
                  <button
                    type="button"
                    className="pane-action-btn"
                    disabled={isSimulating}
                    onClick={onRunSimulation}
                  >
                    <Play size={13} />
                    <span>{isSimulating ? 'Memproses…' : 'Jalankan Batch Baru'}</span>
                  </button>
                )}
              </div>

              {reviewedList.length === 0 ? (
                <div className="drawer-empty-state">
                  <Clock size={36} className="text-muted" />
                  <h4>Belum Ada Episode yang Selesai Ditelaah</h4>
                  <p>
                    Dataset master memuat 364 episode berindikasi tinggi yang memenuhi kelayakan GeoAI.
                    Klik tombol <strong>Jalankan Simulasi</strong> untuk memproses batch demonstrasi.
                  </p>
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
                        <th>Waktu</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewedList.map((rec) => (
                        <tr key={rec.episodeId}>
                          <td>
                            <code className="ep-code">{rec.episodeId}</code>
                          </td>
                          <td>
                            <div className="od-cell">
                              <span className="from-name">{rec.fromName}</span>
                              <span className="arrow">→</span>
                              <span className="to-name">{rec.toName}</span>
                            </div>
                          </td>
                          <td>
                            <strong className="score-val">
                              {rec.initialIndex != null ? rec.initialIndex.toFixed(1) : '-'}
                            </strong>
                          </td>
                          <td>
                            <span className="status-badge-ok">
                              <CheckCircle2 size={12} />
                              Selesai (Simulasi)
                            </span>
                          </td>
                          <td>
                            <span className="time-cell">{rec.timestamp}</span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <Link
                                href={`/episode/${rec.episodeId}`}
                                className="action-link"
                                onClick={onClose}
                              >
                                <span>Buka</span>
                                <ExternalLink size={12} />
                              </Link>
                              {state.reports[rec.episodeId] && (
                                <button
                                  type="button"
                                  className="action-btn-report"
                                  onClick={() => onOpenReport(state.reports[rec.episodeId])}
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
                  Episode yang ditandai untuk tindak lanjut prioritas verifikator berdasarkan hasil telaah agen (bukan seluruh episode tinggi).
                </p>
              </div>

              {priorityList.length === 0 ? (
                <div className="drawer-empty-state">
                  <AlertTriangle size={36} className="text-muted" />
                  <h4>Belum Ada Pembanding / Temuan Prioritas Baru</h4>
                  <p>
                    Saat baseline awal belum dijalankan, episode belum ditandai sebagai temuan baru.
                    Jalankan alur simulasi untuk memicu identifikasi temuan prioritas.
                  </p>
                </div>
              ) : (
                <div className="priority-cards-grid">
                  {priorityList.map((p) => (
                    <div key={p.episodeId} className="priority-finding-card">
                      <div className="card-top">
                        <span className="priority-pill">
                          <AlertTriangle size={12} />
                          Prioritas Verifikasi
                        </span>
                        <code className="ep-code">{p.episodeId}</code>
                      </div>
                      <div className="finding-route">
                        <strong>{p.fromName}</strong> menuju <strong>{p.toName}</strong>
                        {p.altName && <span className="alt-info"> (Alternatif: {p.altName})</span>}
                      </div>
                      <div className="finding-reason">
                        <strong>Alasan Ditandai:</strong>
                        <p>{p.priorityReason || p.findings}</p>
                      </div>
                      <div className="card-footer">
                        <span className="time-label">{p.timestamp}</span>
                        <Link
                          href={`/episode/${p.episodeId}`}
                          className="view-episode-btn"
                          onClick={onClose}
                        >
                          <span>Telaah Episode</span>
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Daftar Laporan */}
          {tab === 'reports' && (
            <div className="drawer-pane">
              <div className="pane-info-bar">
                <p>
                  Berkas laporan penelaahan yang telah diterbitkan sistem. Dapat dibuka dan dicetak / disimpan PDF melalui browser.
                </p>
              </div>

              {reportsList.length === 0 ? (
                <div className="drawer-empty-state">
                  <FileText size={36} className="text-muted" />
                  <h4>Belum Ada Laporan yang Dibuat</h4>
                  <p>
                    Laporan akan otomatis disusun ketika penelaahan agen selesai atau saat tombol "Buat Laporan Episode" ditekan di halaman episode.
                  </p>
                </div>
              ) : (
                <div className="reports-cards-list">
                  {reportsList.map((rpt) => (
                    <div key={rpt.id} className="report-item-card">
                      <div className="report-card-icon">
                        <FileText size={22} className="text-emerald-500" />
                      </div>
                      <div className="report-card-content">
                        <strong>{rpt.title}</strong>
                        <p className="report-sub">
                          Episode <code>{rpt.episodeId}</code> · Indeks Awal: {rpt.initialIndex != null ? rpt.initialIndex.toFixed(1) : '-'} · Diterbitkan: {rpt.createdAt}
                        </p>
                        <p className="report-summary">{rpt.summary}</p>
                      </div>
                      <div className="report-card-actions">
                        <button
                          type="button"
                          className="open-report-btn"
                          onClick={() => onOpenReport(rpt)}
                        >
                          <Printer size={14} />
                          <span>Buka &amp; Cetak</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Kanal Notifikasi */}
          {tab === 'notifications' && (
            <div className="drawer-pane">
              <div className="notification-status-box">
                <h4>Status Integrasi Kanal Notifikasi</h4>
                <div className="channel-grid">
                  <div className="channel-card">
                    <span className="channel-name">Email SMTP Verifikator</span>
                    <span className="channel-status disconnected">Belum Terhubung</span>
                    <p>Kredensial server SMTP dinas belum dikonfigurasi.</p>
                  </div>
                  <div className="channel-card">
                    <span className="channel-name">WhatsApp Business API</span>
                    <span className="channel-status disconnected">Belum Terhubung</span>
                    <p>Gateway perpesanan dinonaktifkan pada tahap POC.</p>
                  </div>
                  <div className="channel-card active">
                    <span className="channel-name">Internal Dispatch BPJS (Simulasi)</span>
                    <span className="channel-status simulated">Mode Simulasi Outbox</span>
                    <p>Pesan dicatat di browser untuk pengujian alur demonstrasi.</p>
                  </div>
                </div>
              </div>

              <div className="outbox-section">
                <h4>Antrean Pesan Keluar (Outbox Simulasi)</h4>
                {state.notifications.length === 0 ? (
                  <p className="text-muted text-sm">Tidak ada pesan dalam antrean keluar saat ini.</p>
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
                <p>Catatan kronologis audit trail penelaahan 6 langkah agen spasial.</p>
              </div>

              {state.logs.length === 0 ? (
                <div className="drawer-empty-state">
                  <Activity size={36} className="text-muted" />
                  <h4>Belum Ada Log Proses</h4>
                  <p>Jalankan simulasi untuk melihat jejak eksekusi mikro-agen SIGARA.</p>
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
                        <code className="log-ep">Episode: {log.episodeId}</code>
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
