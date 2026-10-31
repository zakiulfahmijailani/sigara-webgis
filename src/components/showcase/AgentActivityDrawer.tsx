'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { AgentActivityState, AgentReport } from '@/lib/agent-activity';
import { loadAllClarificationCases, formatSimDateTime } from '@/lib/clarification-demo';
import { useDemoDialog } from './useDemoDialog';
import { latestEpisodeReport, REVIEW_OPTIONS } from '@/lib/officer-review';
type DrawerTab = 'episodes' | 'priorities' | 'reports' | 'notifications' | 'logs' | 'cases';
type Props = { state: AgentActivityState; initialTab?: DrawerTab; isOpen: boolean; onClose: () => void; onOpenReport: (r: AgentReport) => void; onSelectEpisode?: (id: string) => void; caseFilter?: string };
export default function AgentActivityDrawer({ state, initialTab = 'episodes', isOpen, onClose, onOpenReport, onSelectEpisode, caseFilter }: Props) {
  const [tab, setTab] = useState<DrawerTab>(initialTab);
  const dialogRef = useDemoDialog(isOpen, onClose);
  useEffect(() => setTab(initialTab), [initialTab, isOpen]);
  if (!isOpen) return null;
  const cases = Object.values(loadAllClarificationCases()).filter(c => caseFilter === 'awaiting_response' ? c.status === 'awaiting_response' : caseFilter === 'received' ? c.messages.some(m => m.direction === 'inbound') : caseFilter === 'escalated' ? c.status === 'escalated' : true);
  const reports = Object.fromEntries([...new Set(Object.values(state.reports).map(r => r.episodeId))].map(id => [id, latestEpisodeReport(state, id)!]));
  const episodeLink = (id: string) => <Link href={`/episode/${id}#klarifikasi`} onClick={() => { onClose(); onSelectEpisode?.(id); }}>Episode {id} → percakapan kasus</Link>;
  return <div className="agent-drawer-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div ref={dialogRef} className="agent-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="agent-drawer-title" tabIndex={-1}>
      <div className="agent-drawer-header"><div><h3 id="agent-drawer-title">Aktivitas SIGARA Agent</h3><p>Simulasi POC · Tidak ada pengiriman nyata</p></div><button type="button" className="drawer-close-btn" onClick={onClose}>Tutup</button></div>
      <div className="agent-drawer-tabs">{(['episodes', 'priorities', 'reports', 'notifications', 'cases', 'logs'] as DrawerTab[]).map((t, i) => <button type="button" className={`drawer-tab-btn ${tab === t ? 'active' : ''}`} key={t} onClick={() => setTab(t)}>{['Episode Ditelaah', 'Prioritas Baru', 'Laporan', 'Notifikasi', 'Kasus Klarifikasi', 'Log Proses'][i]}</button>)}</div>
      <div className="agent-drawer-body">
        {tab === 'episodes' && <><p>Episode yang telah ditelaah oleh agen atau petugas.</p>
          {Object.values(reports).filter(r => r.officerReview).map(r => <article className="outbox-card" key={r.id}><Link href={`/episode/${r.episodeId}#keputusan-petugas`} onClick={onClose}>Episode {r.episodeId} → keputusan petugas</Link><p>{REVIEW_OPTIONS[r.officerReview!.decision].label}</p><p>{r.officerReview!.officerName} · {formatSimDateTime(r.createdAt)}</p><button type="button" onClick={() => onOpenReport(r)}>Buka laporan hasil</button></article>)}
          {Object.values(state.reviewedEpisodes).filter(r => !reports[r.episodeId]?.officerReview).map(r => <article className="outbox-card" key={r.episodeId}>{episodeLink(r.episodeId)}<p>{r.findings}</p><p>Selesai · {formatSimDateTime(r.timestamp)}</p></article>)}
          {!Object.keys(state.reviewedEpisodes).length && !Object.values(reports).some(r => r.officerReview) && <p>Belum ada episode yang selesai ditelaah.</p>}</>}
        {tab === 'priorities' && <p>Belum ada baseline pembanding untuk menghitung indikasi prioritas baru.</p>}
        {tab === 'reports' && <>{Object.values(reports).map(r => <article className="outbox-card" key={r.id}><strong>{r.title}</strong><p>Versi {r.revision || 1} · {formatSimDateTime(r.createdAt)}</p><button type="button" onClick={() => onOpenReport(r)}>Buka laporan</button>{episodeLink(r.episodeId)}</article>)}{!Object.keys(reports).length && <p>Belum ada laporan demo.</p>}</>}
        {tab === 'notifications' && <><p>Kanal simulasi · {state.notifications.length} pesan outbound. Balasan inbound tidak dihitung. Jenis pesan: permintaan, respons agen, pertanyaan lanjutan, dan pengingat.</p>{state.notifications.map(n => <article className="outbox-card" key={n.id}><strong>{n.subject}</strong><p>Kepada {n.recipientRole} · Terkirim (simulasi)</p><p className="whitespace-pre-wrap">{n.body}</p><p>{formatSimDateTime(n.createdAt)}</p>{episodeLink(n.episodeId)}</article>)}{!state.notifications.length && <p>Belum ada pengiriman simulasi.</p>}</>}
        {tab === 'cases' && <><p>Balasan diterima menghitung kasus unik yang pernah menerima pesan inbound, termasuk kasus yang sudah ditutup.</p>{cases.map(c => <article className="outbox-card" key={c.id}><strong>{c.id} · {c.status}</strong><p>{c.messages.length} pesan · waktu demo {formatSimDateTime(c.simulationClock)}</p>{episodeLink(c.episodeId)}</article>)}{!cases.length && <p>Belum ada kasus dengan status ini.</p>}</>}
        {tab === 'logs' && <>{state.logs.map(l => <article className="outbox-card" key={l.id}><strong>{l.stepName} (simulasi)</strong><p>{l.detail}</p><p>{formatSimDateTime(l.timestamp)}</p>{episodeLink(l.episodeId)}</article>)}{!state.logs.length && <p>Belum ada aktivitas demo.</p>}</>}
      </div>
    </div>
  </div>;
}
