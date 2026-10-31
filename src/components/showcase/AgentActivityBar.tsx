'use client';
import React, { useState, useEffect } from 'react';
import {
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
  getInitialAgentState,
  runDemonstrationSimulation,
  type AgentActivityState,
  type AgentReport,
} from '@/lib/agent-activity';
import { getDemoDashboardState } from '@/lib/clarification-store';
import { loadAllClarificationCases, getClarificationAggregates } from '@/lib/clarification-demo';
import type { Episode } from '@/lib/showcase';

type Props = {
  episodes?: Episode[];
  onSelectEpisode?: (id: string) => void;
};

export default function AgentActivityBar({ episodes = [], onSelectEpisode }: Props) {
  const [state, setState] = useState<AgentActivityState>(getInitialAgentState);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'episodes' | 'priorities' | 'reports' | 'notifications' | 'logs' | 'cases'>('episodes');
  const [activeReport, setActiveReport] = useState<AgentReport | null>(null);

  const [metrics, setMetrics] = useState(() => getClarificationAggregates({}));
  // Load state safely on mount
  useEffect(() => {
    const sync = () => { setState(getDemoDashboardState()); setMetrics(getClarificationAggregates(loadAllClarificationCases())); };
    sync();
    window.addEventListener('sigara-demo-change', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('sigara-demo-change', sync); window.removeEventListener('storage', sync); };
  }, []);

  const stats = state.stats;
  const [caseFilter, setCaseFilter] = useState('all');
  const [busy, setBusy] = useState(false);

  const handleOpenTab = (tab: 'episodes' | 'priorities' | 'reports' | 'notifications' | 'logs' | 'cases') => {
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
              </div>
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
                    <span className="card-sub text-emerald-300">episode unik</span>
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
                    <span className="card-sub text-amber-300">belum ada pembanding</span>
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
                    <span className="card-sub text-sky-300">episode unik</span>
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
                    <span className="card-sub text-amber-300">pesan simulasi</span>
                  </div>
                </div>
              </button>
            </div>

            <div className="demo-chips">
              {[['awaiting_response', 'Menunggu balasan', metrics.awaitingCount], ['received', 'Balasan diterima', metrics.receivedCount], ['escalated', 'Perlu tindak lanjut petugas', metrics.escalatedCount]].map(([filter, label, count]) => <button type="button" key={filter} onClick={() => { setCaseFilter(String(filter)); handleOpenTab('cases'); }}>{label}: {count}</button>)}
              <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await runDemonstrationSimulation(episodes, loadAgentState()); setState(getDemoDashboardState()); } finally { setBusy(false); } }}>{busy ? 'Menelaah…' : 'Telaah 3 episode (simulasi)'}</button>
            </div>
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
        caseFilter={caseFilter}
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
