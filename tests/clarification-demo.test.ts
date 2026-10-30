import test from 'node:test';
import assert from 'node:assert/strict';
import episodes from '../src/data/ntt-episodes.json';
import type { Episode } from '../src/lib/showcase';
import { createClarificationCase, simulateSendDraft, simulateReceiveReply, simulateAgentInquiryReply, simulateSendFollowup, advanceSimulationTime, closeCase, getClarificationAggregates } from '../src/lib/clarification-demo';
import { startDemo, advanceDemoClock, getDemoDashboardState, getDemoClock } from '../src/lib/clarification-store';
import { getCaseForEpisode, deleteClarificationCase } from '../src/lib/clarification-demo';
import { loadAgentState } from '../src/lib/agent-activity';
import { readDemoStorage, writeDemoStorage } from '../src/lib/demo-storage';
const ep = episodes.find(e => e.id === '290411124Y000018') as Episode;
const ep2 = episodes.find(e => e.id === '177250424P000119') as Episode;
const initial = JSON.stringify(episodes);
const draft = (flow: 'complete' | 'followup' | 'no_response' = 'complete') => createClarificationCase(ep, flow);
test('Eligibility rejects medium/low and missing initial index', () => {
  for (const index of [null, 30, 60]) assert.throws(() => createClarificationCase({ ...ep, cat: 'SEDANG_SIM', fraudIdx: index }));
});
test('Complete response is linked, stops reminders, requires officer notes, and closed cases stay closed', () => {
  const d = draft(); assert.equal(simulateReceiveReply(d, ep), d);
  const sent = simulateSendDraft(d); assert.equal(simulateSendDraft(sent), sent);
  const reply = simulateReceiveReply(sent, ep);
  const m = reply.messages[1];
  assert.equal(m.caseId, reply.id); assert.equal(m.episodeId, ep.id); assert.equal(m.threadId, d.messages[0].threadId); assert.equal(m.inReplyToMessageId, d.messages[0].id);
  assert.equal(reply.status, 'ready_for_review');
  assert.equal(simulateReceiveReply(reply, ep), reply);
  assert.equal(advanceSimulationTime(reply, 100, ep).messages.length, 2);
  assert.equal(closeCase(reply, 'sufficient', '  '), reply);
  const closed = closeCase(reply, 'sufficient', 'Arsip demo ditinjau petugas.');
  assert.equal(closed.status, 'closed');
  assert.equal(closeCase(closed, 'sufficient', 'again'), closed);
  assert.equal(simulateReceiveReply(closed, ep), closed);
});
test('Staged conversation survives reminders and keeps inquiry, agent answer, partial and final response', () => {
  let c = simulateSendDraft(draft('followup'));
  c = advanceSimulationTime(c, 2, ep);
  c = simulateReceiveReply(c, ep); assert.equal(c.status, 'response_received'); assert.equal(c.dueAt, null);
  c = simulateAgentInquiryReply(c, ep); assert.equal(c.status, 'awaiting_response'); assert.ok(c.messages.at(-1)?.body.includes(ep.altName!));
  assert.ok(c.messages.find(m => m.id === c.messages.at(-1)?.inReplyToMessageId)?.direction === 'inbound');
  c = simulateReceiveReply(c, ep); assert.equal(c.status, 'followup_required'); assert.ok(c.missingItems?.length);
  assert.equal(c.messages.at(-1)?.round, c.currentRound);
  c = simulateSendFollowup(c, ep); assert.equal(c.currentRound, 3); assert.equal(c.reminderCount, 0);
  c = advanceSimulationTime(c, 2, ep);
  c = simulateReceiveReply(c, ep); assert.equal(c.status, 'ready_for_review');
  assert.equal(c.messages.filter(m => m.direction === 'inbound').length, 3);
  assert.equal(new Set(c.messages.map(m => m.id)).size, c.messages.length);
});
test('Deadlines, bounded jumps, escalation, late reply and metrics agree', () => {
  const sent = simulateSendDraft(draft('no_response'));
  assert.equal(advanceSimulationTime(sent, 1, ep).reminderCount, 0);
  const one = advanceSimulationTime(sent, 2, ep); assert.equal(one.reminderCount, 1);
  assert.ok(one.messages.at(-1)?.body.includes(sent.id));
  assert.ok(one.messages.at(-1)?.body.includes(sent.messages[0].id));
  assert.equal(advanceSimulationTime(one, 0, ep), one);
  const jumped = advanceSimulationTime(sent, 100, ep); assert.equal(jumped.status, 'escalated'); assert.equal(jumped.reminderCount, 2); assert.equal(jumped.messages.length, 3);
  assert.equal(jumped.events.filter(e => e.type === 'reminder_sent').length, 2);
  assert.ok(jumped.events.every((e, i, a) => !i || Date.parse(e.occurredAt) >= Date.parse(a[i-1].occurredAt)));
  const late = simulateReceiveReply(jumped, ep); assert.equal(late.status, 'ready_for_review');
  const closed = closeCase(late, 'further_study', 'Verifikasi lanjutan.');
  const stats = getClarificationAggregates({ [ep.id]: closed });
  assert.equal(stats.outboundSimulatedCount, 3); assert.equal(stats.inboundSimulatedCount, 1); assert.equal(stats.receivedCount, 1); assert.equal(stats.closedCount, 1);
  assert.equal(JSON.stringify(episodes), initial);
  assert.equal(simulateReceiveReply(sent, ep2), sent);
});
test('Shared storage deduplicates start, keeps reports, preserves clock on reload, resets only selected case', () => {
  const storage = new Map<string, string>();
  storage.set('sigara-agent-activity-v3', JSON.stringify({ version: '3.0.0', stats: { stakeholdersNotified: 289 } }));
  const fake = { localStorage: { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) }, dispatchEvent: () => true };
  Object.defineProperty(globalThis, 'window', { value: fake, configurable: true });
  try {
    assert.equal(getDemoDashboardState().stats.stakeholdersNotified, 0);
    assert.ok(storage.has('sigara-agent-activity-v3'));
    const a = startDemo(ep, 'complete'); const b = startDemo(ep, 'followup'); assert.deepEqual(a, b);
    startDemo(ep2, 'no_response');
    const before = getDemoClock(); getCaseForEpisode(ep.id); assert.equal(getDemoClock(), before);
    advanceDemoClock(1);
    assert.equal(getCaseForEpisode(ep.id)?.simulationClock, getCaseForEpisode(ep2.id)?.simulationClock);
    assert.equal(getDemoDashboardState().stats.reportsGenerated, 2);
    const report = loadAgentState().reports[a.reportId]; assert.ok(report?.isSimulation);
    deleteClarificationCase(ep.id); assert.ok(getCaseForEpisode(ep2.id)); assert.equal(getCaseForEpisode(ep.id), null);
    assert.equal(JSON.stringify(episodes), initial);
  } finally { Reflect.deleteProperty(globalThis, 'window'); }
});

test('Storage write failure keeps the latest temporary state even when an older stored value is readable', () => {
  let failWrites = true;
  let stored = 'old';
  Object.defineProperty(globalThis, 'window', { value: {
    localStorage: { getItem: () => stored, setItem: (_k: string, value: string) => { if (failWrites) throw new Error('Quota exceeded'); stored = value; } },
    dispatchEvent: () => true,
  }, configurable: true });
  try {
    writeDemoStorage('sigara-test-temporary', 'latest');
    assert.equal(readDemoStorage('sigara-test-temporary'), 'latest');
    failWrites = false;
    writeDemoStorage('sigara-test-temporary', 'persisted');
    assert.equal(readDemoStorage('sigara-test-temporary'), 'persisted');
    assert.equal(stored, 'persisted');
  } finally { Reflect.deleteProperty(globalThis, 'window'); }
});
