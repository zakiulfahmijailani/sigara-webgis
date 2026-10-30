import episodes from '@/data/ntt-episodes.json';
import type { Episode } from './showcase';
import type { ClarificationCase, FixtureId } from './clarification-demo-types';
import { loadAgentState, saveAgentState, createEpisodeReport, getEpisodeEligibility, type AgentActivityState } from './agent-activity';
import { loadAllClarificationCases, saveClarificationCase, createClarificationCase, advanceSimulationTime, getClarificationAggregates } from './clarification-demo';
import { readDemoStorage, writeDemoStorage } from './demo-storage';

export const DEMO_CLOCK_KEY = 'sigara-demo-clock-v1';
export function getDemoClock(): string {
  return readDemoStorage(DEMO_CLOCK_KEY) || new Date().toISOString();
}
export function persistCase(c: ClarificationCase): void {
  if (JSON.stringify(loadAllClarificationCases()[c.episodeId]) === JSON.stringify(c)) return;
  const state = loadAgentState();
  const original = state.reports[c.reportId];
  if (!original) throw new Error('Buat laporan sebelum membuka kasus.');
  const revision = 1 + Math.max(0, ...Object.values(state.reports).filter(r => r.episodeId === c.episodeId).map(r => r.revision || 0));
  const id = `${c.reportId}-v${revision}`;
  state.reports[id] = { ...original, id, revision, clarification: structuredClone(c), createdAt: c.updatedAt, isSimulation: true };
  saveAgentState(state);
  saveClarificationCase(c);
}
export function startDemo(episode: Episode, fixture: FixtureId): ClarificationCase {
  if (getEpisodeEligibility(episode).eligibility !== 'eligible') throw new Error('Episode belum memenuhi eligibility klarifikasi.');
  const existing = loadAllClarificationCases()[episode.id];
  if (existing) return existing;
  const clock = getDemoClock();
  writeDemoStorage(DEMO_CLOCK_KEY, clock);
  const state = loadAgentState();
  const report = { ...createEpisodeReport(episode), createdAt: clock };
  state.reports[report.id] = state.reports[report.id] || report;
  saveAgentState(state);
  const c = createClarificationCase(episode, fixture, report.id, clock);
  persistCase(c);
  return c;
}
export function advanceDemoClock(days: number): void {
  if (!Number.isFinite(days) || days <= 0 || days > 3650) return;
  const clock = getDemoClock();
  const target = new Date(Date.parse(clock) + days * 86400000).toISOString();
  const cases = loadAllClarificationCases();
  for (const c of Object.values(cases)) {
    const ep = (episodes as unknown as Episode[]).find(e => e.id === c.episodeId);
    if (!ep || c.status === 'closed') continue;
    persistCase(advanceSimulationTime({ ...c, simulationClock: clock }, days, ep));
  }
  writeDemoStorage(DEMO_CLOCK_KEY, target);
}
export function getDemoDashboardState(): AgentActivityState {
  const state = loadAgentState();
  const cases = loadAllClarificationCases();
  const metrics = getClarificationAggregates(cases);
  const reports = Object.values(state.reports);
  const reviewed = Object.values(state.reviewedEpisodes).filter(r => r.reviewStatus === 'completed' && r.reviewMode === 'simulation');
  const notifications = Object.values(cases).flatMap(c => c.messages.filter(m => m.direction === 'outbound' && m.status === 'sent_simulated').map(m => ({
    id: m.id, episodeId: c.episodeId, recipientRole: m.recipientName, channel: 'Kanal simulasi', status: 'sent' as const,
    subject: m.subject, body: m.body, createdAt: m.createdAt,
  })));
  return { ...state, notifications,
    logs: [...state.logs, ...Object.values(cases).flatMap(c => c.events.map(e => ({ id: e.id, timestamp: e.occurredAt, episodeId: c.episodeId, mode: 'simulation' as const, status: 'completed' as const, stepName: e.type, detail: e.detail })))],
    stats: { ...state.stats, episodesReviewed: reviewed.length, episodesReviewedToday: 0, priorityFindings: 0, criticalNew: 0,
      reportsGenerated: new Set(reports.map(r => r.episodeId)).size, reportsToday: 0,
      stakeholdersNotified: metrics.outboundSimulatedCount, notificationsPending: 0 },
  };
}
