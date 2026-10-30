'use client';
import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Bell,
  Activity,
  Play,
  LoaderCircle,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import AgentActivityDrawer from './AgentActivityDrawer';
import ReportViewerModal from './ReportViewerModal';
import {
  loadAgentState,
  saveAgentState,
  runDemonstrationSimulation,
  type AgentActivityState,
  type AgentReport,
} from '@/lib/agent-activity';
import type { Episode } from '@/lib/showcase';

type Props = {
  episodes?: Episode[];
  onSelectEpisode?: (id: string) => void;
};

export default function AgentActivityBar({ episodes = [], onSelectEpisode }: Props) {
  const [state, setState] = useState<AgentActivityState>(loadAgentState);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'episodes' | 'priorities' | 'reports' | 'notifications' | 'logs'>('episodes');
  const [activeReport, setActiveReport] = useState<AgentReport | null>(null);

  // Load from local storage after mount for hydration safety
  useEffect(() => {
    setState(loadAgentState());
  }, []);

  const highEpisodes = episodes.filter((e) => e.cat === 'TINGGI_SIM' || (e.fraudIdx != null && e.fraudIdx > 60));
  const queueCount = highEpisodes.length;

  const reviewedList = Object.values(state.reviewedEpisodes);
  const reviewedCount = reviewedList.length;

  const priorityList = reviewedList.filter((r) => r.isNewPriority);
  const priorityCount = priorityList.length;

  const reportsList = Object.values(state.reports);
  const reportsCount = reportsList.length;

  const handleOpenTab = (tab: 'episodes' | 'priorities' | 'reports' | 'notifications' | 'logs') => {
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

  const handleRunSim = async () => {
    if (isSimulating || !episodes.length) return;
    setIsSimulating(true);
    setSimMessage('Menyiapkan batch evaluasi episode tinggi…');

    try {
      const updated = await runDemonstrationSimulation(highEpisodes, state, (step, total, msg) => {
        setSimMessage(`Langkah ${step}/${total}: ${msg}`);
      });
      setState(updated);
    } catch (err) {
      console.error('Error running simulation:', err);
    } finally {
      setIsSimulating(false);
      setSimMessage(null);
    }
  };

  // Status computation
  let statusBadge = { label: 'Siap', class: 'ready' };
  if (isSimulating) {
    statusBadge = { label: 'Memeriksa (Simulasi)', class: 'reviewing' };
  } else if (state.systemStatus === 'attention') {
    statusBadge = { label: 'Perlu Perhatian', class: 'attention' };
  } else if (reviewedCount > 0) {
    statusBadge = { label: 'Siap', class: 'ready' };
  }

  return (
    <>
      <aside className="agent-activity-bar" aria-label="Ringkasan Aktivitas SIGARA Agent">
        <div className="agent-bar-inner">
          {/* Row 1: Status & Context */}
          <div className="agent-bar-top">
            <div className="agent-brand-col">
              <div className="flex items-center gap-2">
                <BrandLogo size={22} priority decorative className="agent-mini-logo" />
                <span className="agent-name">SIGARA Agent</span>
                <span className="agent-separator">·</span>
                <span className={`agent-status-tag ${statusBadge.class}`}>
                  <span className="status-dot" />
                  {statusBadge.label}
                </span>
                <span className="agent-poc-pill">
                  <Sparkles size={11} />
                  Simulasi POC · Seluruh NTT
                </span>
              </div>
            </div>

            <div className="agent-context-col">
              <span className="agent-context-item">
                Pemeriksaan terakhir: <strong>{state.lastRunTimestamp || 'Belum ada proses'}</strong>
              </span>
              <span className="agent-context-sep">·</span>
              <span className="agent-context-item">
                <strong>{queueCount}</strong> antrean GeoAI
              </span>
              <span className="agent-context-sep">·</span>
              <span className="agent-context-item">
                <strong>{priorityCount}</strong> prioritas baru
              </span>
            </div>
          </div>

          {/* Row 2: 4 Activity Cards + Action Buttons */}
          <div className="agent-bar-bottom">
            <div className="agent-cards-row">
              {/* Card 1: Episode Ditelaah */}
              <button
                type="button"
                className="agent-metric-card"
                onClick={() => handleOpenTab('episodes')}
                aria-label={`Buka daftar episode ditelaah, total ${reviewedCount}`}
              >
                <div className="card-icon-wrap icon-episodes">
                  <CheckCircle2 size={16} />
                </div>
                <div className="card-info">
                  <span className="card-label">EPISODE DITELAAH</span>
                  <div className="card-stat-row">
                    <strong className="card-stat">{reviewedCount}</strong>
                    <span className="card-sub">{reviewedCount > 0 ? 'selesai (simulasi)' : 'belum ada'}</span>
                  </div>
                </div>
              </button>

              {/* Card 2: Indikasi Prioritas Baru */}
              <button
                type="button"
                className="agent-metric-card"
                onClick={() => handleOpenTab('priorities')}
                aria-label={`Buka indikasi prioritas baru, total ${priorityCount}`}
              >
                <div className="card-icon-wrap icon-priority">
                  <AlertTriangle size={16} />
                </div>
                <div className="card-info">
                  <span className="card-label">INDIKASI PRIORITAS BARU</span>
                  <div className="card-stat-row">
                    {priorityCount > 0 ? (
                      <>
                        <strong className="card-stat text-amber-400">{priorityCount}</strong>
                        <span className="card-sub text-amber-300">perlu telaah</span>
                      </>
                    ) : (
                      <span className="card-stat text-muted-stat">Belum ada pembanding</span>
                    )}
                  </div>
                </div>
              </button>

              {/* Card 3: Laporan Dibuat */}
              <button
                type="button"
                className="agent-metric-card"
                onClick={() => handleOpenTab('reports')}
                aria-label={`Buka daftar laporan dibuat, total ${reportsCount}`}
              >
                <div className="card-icon-wrap icon-reports">
                  <FileText size={16} />
                </div>
                <div className="card-info">
                  <span className="card-label">LAPORAN DIBUAT</span>
                  <div className="card-stat-row">
                    <strong className="card-stat">{reportsCount}</strong>
                    <span className="card-sub">{reportsCount > 0 ? 'tersedia cetak' : 'belum terbit'}</span>
                  </div>
                </div>
              </button>

              {/* Card 4: Notifikasi Terkirim */}
              <button
                type="button"
                className="agent-metric-card"
                onClick={() => handleOpenTab('notifications')}
                aria-label="Lihat status kanal notifikasi terkirim"
              >
                <div className="card-icon-wrap icon-notif">
                  <Bell size={16} />
                </div>
                <div className="card-info">
                  <span className="card-label">NOTIFIKASI TERKIRIM</span>
                  <div className="card-stat-row">
                    <span className="card-stat text-muted-stat">Belum terhubung</span>
                    <span className="card-sub">kanal non-aktif</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Actions */}
            <div className="agent-actions-group">
              <button
                type="button"
                className="agent-btn-view"
                onClick={() => handleOpenTab('logs')}
                aria-label="Buka panel aktivitas lengkap SIGARA Agent"
              >
                <Activity size={14} />
                <span>Lihat Aktivitas</span>
              </button>

              <button
                type="button"
                className={`agent-btn-sim ${isSimulating ? 'running' : ''}`}
                disabled={isSimulating}
                onClick={handleRunSim}
                title="Jalankan alur demonstrasi 6 langkah agen untuk batch episode berisiko tinggi"
              >
                {isSimulating ? (
                  <>
                    <LoaderCircle size={14} className="spin" />
                    <span>Memproses…</span>
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    <span>Jalankan Simulasi</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Running progress notification bar (conditional) */}
          {isSimulating && simMessage && (
            <div className="agent-progress-bar" role="status" aria-live="polite">
              <LoaderCircle size={13} className="spin" />
              <span>{simMessage}</span>
            </div>
          )}
        </div>
      </aside>

      {/* Drawer Panel */}
      <AgentActivityDrawer
        state={state}
        initialTab={drawerTab}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenReport={(report) => {
          setDrawerOpen(false);
          setActiveReport(report);
        }}
        onRunSimulation={handleRunSim}
        isSimulating={isSimulating}
      />

      {/* Report Modal */}
      {activeReport && (
        <ReportViewerModal
          report={activeReport}
          onClose={() => setActiveReport(null)}
        />
      )}
    </>
  );
}
