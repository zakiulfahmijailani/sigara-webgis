'use client';
import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Bell,
  Activity,
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import AgentActivityDrawer from './AgentActivityDrawer';
import ReportViewerModal from './ReportViewerModal';
import {
  loadAgentState,
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'episodes' | 'priorities' | 'reports' | 'notifications' | 'logs'>('episodes');
  const [activeReport, setActiveReport] = useState<AgentReport | null>(null);

  // Load state safely on mount
  useEffect(() => {
    setState(loadAgentState());
  }, []);

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

  const handleOpenTab = (tab: 'episodes' | 'priorities' | 'reports' | 'notifications' | 'logs') => {
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

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
                <span className="agent-status-tag active">
                  <span className="status-dot active" />
                  Aktif
                </span>
                <span className="agent-poc-pill">
                  <Sparkles size={11} />
                  Otomatis · Seluruh NTT
                </span>
              </div>
            </div>

            <div className="agent-context-col">
              <span className="agent-context-item">
                Analisis terakhir: <strong>2 jam lalu · 3 episode dinilai ulang · 1 KRITIS terdeteksi</strong>
              </span>
              <span className="agent-context-sep">·</span>
              <span className="agent-context-item">
                Jadwal berikutnya: <strong>{state.nextRunCountdown || '22j 10m'}</strong>
              </span>
            </div>
          </div>

          {/* Row 2: 4 Metric Cards + Action Button */}
          <div className="agent-bar-bottom">
            <div className="agent-cards-row">
              {/* Card 1: Episode Ditelaah */}
              <button
                type="button"
                className="agent-metric-card"
                onClick={() => handleOpenTab('episodes')}
                aria-label={`Buka daftar episode ditelaah, total ${stats.episodesReviewed}`}
              >
                <div className="card-icon-wrap icon-episodes">
                  <CheckCircle2 size={16} />
                </div>
                <div className="card-info">
                  <span className="card-label">EPISODE DITELAAH</span>
                  <div className="card-stat-row">
                    <strong className="card-stat">{stats.episodesReviewed}</strong>
                    <span className="card-sub text-emerald-300">+{stats.episodesReviewedToday} hari ini</span>
                  </div>
                </div>
              </button>

              {/* Card 2: Indikasi Prioritas Baru */}
              <button
                type="button"
                className="agent-metric-card"
                onClick={() => handleOpenTab('priorities')}
                aria-label={`Buka indikasi prioritas baru, total ${stats.priorityFindings}`}
              >
                <div className="card-icon-wrap icon-priority">
                  <AlertTriangle size={16} />
                </div>
                <div className="card-info">
                  <span className="card-label">INDIKASI PRIORITAS BARU</span>
                  <div className="card-stat-row">
                    <strong className="card-stat text-amber-400">{stats.priorityFindings}</strong>
                    <span className="card-sub text-amber-300">{stats.criticalNew} KRITIS baru</span>
                  </div>
                </div>
              </button>

              {/* Card 3: Laporan Dibuat */}
              <button
                type="button"
                className="agent-metric-card"
                onClick={() => handleOpenTab('reports')}
                aria-label={`Buka daftar laporan dibuat, total ${stats.reportsGenerated}`}
              >
                <div className="card-icon-wrap icon-reports">
                  <FileText size={16} />
                </div>
                <div className="card-info">
                  <span className="card-label">LAPORAN DIBUAT</span>
                  <div className="card-stat-row">
                    <strong className="card-stat">{stats.reportsGenerated}</strong>
                    <span className="card-sub text-sky-300">+{stats.reportsToday} hari ini</span>
                  </div>
                </div>
              </button>

              {/* Card 4: Notifikasi Stakeholder */}
              <button
                type="button"
                className="agent-metric-card"
                onClick={() => handleOpenTab('notifications')}
                aria-label={`Lihat status notifikasi stakeholder, total ${stats.stakeholdersNotified}`}
              >
                <div className="card-icon-wrap icon-notif">
                  <Bell size={16} />
                </div>
                <div className="card-info">
                  <span className="card-label">NOTIFIKASI STAKEHOLDER</span>
                  <div className="card-stat-row">
                    <strong className="card-stat">{stats.stakeholdersNotified}</strong>
                    <span className="card-sub text-amber-300">{stats.notificationsPending} antrean</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Actions: Hanya Lihat Aktivitas, tanpa tombol jalankan manual */}
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
            </div>
          </div>
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
        onSelectEpisode={onSelectEpisode}
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
