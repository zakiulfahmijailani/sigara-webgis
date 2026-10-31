import test from 'node:test';
import assert from 'node:assert/strict';
import episodes from '../src/data/ntt-episodes.json';
import type { Episode } from '../src/lib/showcase';
import { getInitialAgentState, createEpisodeReport } from '../src/lib/agent-activity';
import { approveOfficerReview, emptyOfficerDraft, latestEpisodeReport, REVIEW_OPTIONS, reviewValidation, type OfficerReviewDraft, type OfficerDecision } from '../src/lib/officer-review';

const episode = episodes[0] as unknown as Episode;
const complete = (): OfficerReviewDraft => ({ ...emptyOfficerDraft(episode.id), decision: 'not_fraud', officerName: 'Rina Utami', officerRole: 'Verifikator Kupang', reasons: ['Kebutuhan klinis pasien'], evidence: 'Surat rujukan 031; klarifikasi 31 Oktober', notes: 'Layanan spesialis tersedia di fasilitas tujuan.', followup: 'Arsipkan hasil telaah', acknowledged: true });

test('Approval requires explicit decision, officer identity, evidence, justification, and consent', () => {
  assert.equal(reviewValidation(emptyOfficerDraft(episode.id)).length, 8);
  for (const field of ['decision', 'officerName', 'officerRole', 'evidence', 'notes', 'followup'] as const) {
    const draft = { ...complete(), [field]: ' ' } as OfficerReviewDraft;
    assert.throws(() => approveOfficerReview(getInitialAgentState(), episode, draft));
  }
  assert.throws(() => approveOfficerReview(getInitialAgentState(), episode, { ...complete(), acknowledged: false }));
  assert.throws(() => approveOfficerReview(getInitialAgentState(), episode, { ...complete(), reasons: [] }));
});
test('Each outcome has the correct final or pending status and original episode identity', () => {
  for (const decision of Object.keys(REVIEW_OPTIONS) as OfficerDecision[]) {
    const result = approveOfficerReview(getInitialAgentState(), episode, { ...complete(), decision });
    assert.equal(result.report.officerReview?.status, REVIEW_OPTIONS[decision].final ? 'final' : 'followup');
    assert.equal(result.report.fromName, episode.fromName);
    assert.equal(result.report.toName, episode.toName);
    assert.equal(result.report.initialIndex, episode.fraudIdx);
    assert.equal(result.report.officerReview?.officerName, 'Rina Utami');
    assert.match(result.report.title, REVIEW_OPTIONS[decision].final ? /Laporan Akhir/ : /Telaah Lanjutan/);
  }
});
test('Revision is immutable, removes only this episode draft, and rejects stale approvals', () => {
  const draft = complete();
  const state = getInitialAgentState();
  state.officerDrafts = { [episode.id]: draft, other: emptyOfficerDraft('other') };
  const first = approveOfficerReview(state, episode, draft);
  draft.notes = 'Changed'; draft.reasons.push('Pola rujukan tidak wajar');
  assert.notEqual(first.report.officerReview?.notes, draft.notes);
  assert.equal(first.report.officerReview?.reasons.length, 1);
  assert.equal(first.state.officerDrafts?.[episode.id], undefined);
  assert.ok(first.state.officerDrafts?.other);
  assert.throws(() => approveOfficerReview(first.state, episode, complete()), /lebih baru/);
  const second = approveOfficerReview(first.state, episode, { ...complete(), baseRevision: 1, decision: 'suspected_fraud' });
  assert.equal(second.report.officerReview?.revision, 2);
  assert.equal(second.state.reports[first.report.id].officerReview?.decision, 'not_fraud');
  assert.equal(Object.keys(state.reports).length, 0);
  assert.equal(second.state.stats.reportsGenerated, 1);
  assert.equal(second.state.stats.episodesReviewed, 1);
});
test('Report entry points prefer latest officer snapshot even after new system reports', () => {
  const result = approveOfficerReview(getInitialAgentState(), episode, complete());
  result.state.reports.newer = { ...createEpisodeReport(episode), revision: 99 };
  assert.equal(latestEpisodeReport(result.state, episode.id)?.id, result.report.id);
  assert.equal(latestEpisodeReport(result.state, 'other'), undefined);
  assert.throws(() => approveOfficerReview(result.state, episode, { ...complete(), episodeId: 'other' }), /tidak sesuai/);
});
