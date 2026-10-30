import { readDemoStorage, writeDemoStorage } from './demo-storage';
import type { Episode } from './showcase';
import { getEpisodeEligibility } from './agent-activity';
import type {
  ClarificationCase,
  CaseMessage,
  CaseEvent,
  CaseStatus,
  FixtureId,
  ClosureReason,
} from './clarification-demo-types';
import {
  OFFICER_NAME,
  OFFICER_EMAIL,
  AGENT_NAME,
  AGENT_EMAIL,
  FASKES_EMAIL,
  getFaskesContactName,
  getInitialRequestContent,
  getCompleteFlowResponses,
  getFollowupFlowResponses,
  getNoResponseFlowReminders,
} from '@/data/clarification-demo-fixtures';

export const CLARIFICATION_STORAGE_KEY = 'sigara-clarification-cases-v1';

// Base reference simulation time: 30 Oktober 2026, 09:00:00 WITA (01:00:00 UTC)
export const DEFAULT_SIMULATION_START = '2026-10-30T01:00:00.000Z';

function addDaysToIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

/**
 * Format ISO date string into Indonesian Asia/Jakarta label
 */
export function formatSimDateTime(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return (
      d.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB'
    );
  } catch {
    return isoString;
  }
}

/**
 * Create a new clarification case in draft status for an episode.
 */
export function createClarificationCase(
  episode: Episode,
  fixtureId: FixtureId = 'complete',
  reportId?: string,
  startClock: string = DEFAULT_SIMULATION_START
): ClarificationCase {
  if (getEpisodeEligibility(episode).eligibility !== 'eligible') throw new Error('Indeks awal belum memenuhi eligibility klarifikasi.');
  const caseId = `CASE-${episode.id}`;
  const rptId = reportId || `RPT-${episode.id}`;
  const initialReq = getInitialRequestContent(episode, rptId);

  const initialDraftMessage: CaseMessage = {
    id: `MSG-${caseId}-r1-m1`,
    caseId,
    episodeId: episode.id,
    threadId: `TH-${caseId}`,
    round: 1,
    inReplyToMessageId: null,
    senderRole: 'officer',
    senderName: OFFICER_NAME,
    senderAddress: OFFICER_EMAIL,
    recipientName: getFaskesContactName(episode),
    recipientAddress: FASKES_EMAIL,
    subject: initialReq.subject,
    body: initialReq.body,
    direction: 'outbound',
    status: 'draft',
    createdAt: startClock,
    attachmentReportIds: [rptId],
  };

  const initialEvent: CaseEvent = {
    id: `EVT-${caseId}-created`,
    caseId,
    episodeId: episode.id,
    type: 'case_created',
    occurredAt: startClock,
    mode: 'simulation',
    detail: `Draf kasus klarifikasi disiapkan untuk ${episode.fromName} (Alur contoh: ${fixtureId}).`,
  };

  return {
    id: caseId,
    episodeId: episode.id,
    reportId: rptId,
    mode: 'simulation',
    fixtureId,
    status: 'draft',
    createdAt: startClock,
    updatedAt: startClock,
    dueAt: null,
    simulationClock: startClock,
    reminderCount: 0,
    maxReminders: 2,
    currentRound: 1,
    messages: [initialDraftMessage],
    events: [initialEvent],
    summary: null,
    missingItems: [],
    closedAt: null,
    closureReason: null,
    closureNotes: null,
    closedBy: null,
  };
}

/**
 * Transition: draft -> awaiting_response (Simulasikan Pengiriman)
 */
export function simulateSendDraft(caseObj: ClarificationCase): ClarificationCase {
  if (caseObj.status !== 'draft') return caseObj;

  const clock = caseObj.simulationClock;
  const due = addDaysToIso(clock, 2);

  const updatedMessages = caseObj.messages.map((m, idx) =>
    idx === 0
      ? {
          ...m,
          status: 'sent_simulated' as const,
          createdAt: clock,
        }
      : m
  );

  const newEvent: CaseEvent = {
    id: `EVT-${caseObj.id}-${caseObj.events.length}-send`,
    caseId: caseObj.id,
    episodeId: caseObj.episodeId,
    type: 'message_sent',
    occurredAt: clock,
    mode: 'simulation',
    relatedMessageId: updatedMessages[0].id,
    detail: 'Surat permintaan klarifikasi terkirim secara simulasi. Tenggat balasan 2 hari simulasi.',
  };

  return {
    ...caseObj,
    status: 'awaiting_response',
    updatedAt: clock,
    dueAt: due,
    reminderCount: 0,
    messages: updatedMessages,
    events: [...caseObj.events, newEvent],
  };
}

/**
 * Transition: Simulasikan Balasan Stakeholder
 * Handles flow-specific responses for complete, followup, and belated replies.
 */
export function simulateReceiveReply(
  caseObj: ClarificationCase,
  episode: Episode
): ClarificationCase {
  if (!['awaiting_response', 'escalated'].includes(caseObj.status) || episode.id !== caseObj.episodeId) return caseObj;
  const clock = caseObj.simulationClock;

  if (caseObj.fixtureId === 'complete') {
    // Alur 1: Full response
    const flow = getCompleteFlowResponses(episode);
    const replyMsg: CaseMessage = {
      id: `MSG-${caseObj.id}-r1-m2`,
      caseId: caseObj.id,
      episodeId: episode.id,
      threadId: `TH-${caseObj.id}`,
      round: 1,
      inReplyToMessageId: caseObj.messages[0]?.id || null,
      senderRole: 'stakeholder',
      senderName: getFaskesContactName(episode),
      senderAddress: FASKES_EMAIL,
      recipientName: OFFICER_NAME,
      recipientAddress: OFFICER_EMAIL,
      subject: flow.stakeholderReply.subject,
      body: flow.stakeholderReply.body,
      direction: 'inbound',
      status: 'received_simulated',
      createdAt: clock,
      attachmentReportIds: [],
    };

    const newEvent: CaseEvent = {
      id: `EVT-${caseObj.id}-${caseObj.events.length}-recv`,
      caseId: caseObj.id,
      episodeId: episode.id,
      type: 'message_received',
      occurredAt: clock,
      mode: 'simulation',
      relatedMessageId: replyMsg.id,
      detail: `Balasan klarifikasi lengkap diterima dari ${episode.fromName} (Simulasi).`,
    };

    return {
      ...caseObj,
      status: 'ready_for_review',
      updatedAt: clock,
      dueAt: null,
      messages: [...caseObj.messages, replyMsg],
      events: [...caseObj.events, newEvent],
      summary: {
        ...flow.summary,
        updatedAt: clock,
      },
      missingItems: [],
    };
  }

  if (caseObj.fixtureId === 'followup') {
    const flow = getFollowupFlowResponses(episode);
    const msgCount = caseObj.messages.filter(m => !m.id.includes('-rem')).length;

    if (msgCount === 1) {
      // Step 2: Stakeholder inquiry
      const inqMsg: CaseMessage = {
        id: `MSG-${caseObj.id}-r1-m2`,
        caseId: caseObj.id,
        episodeId: episode.id,
        threadId: `TH-${caseObj.id}`,
        round: 1,
        inReplyToMessageId: caseObj.messages[0]?.id || null,
        senderRole: 'stakeholder',
        senderName: `Staf Administrasi Rujukan ${episode.fromName}`,
        senderAddress: FASKES_EMAIL,
        recipientName: OFFICER_NAME,
        recipientAddress: OFFICER_EMAIL,
        subject: flow.stakeholderInquiry.subject,
        body: flow.stakeholderInquiry.body,
        direction: 'inbound',
        status: 'received_simulated',
        createdAt: clock,
        attachmentReportIds: [],
      };

      const inqEvent: CaseEvent = {
        id: `EVT-${caseObj.id}-${caseObj.events.length}-inq`,
        caseId: caseObj.id,
        episodeId: episode.id,
        type: 'message_received',
        occurredAt: clock,
        mode: 'simulation',
        relatedMessageId: inqMsg.id,
        detail: 'Faskes mengajukan pertanyaan klarifikasi mengenai acuan pembanding (Simulasi).',
      };

      return {
        ...caseObj,
        status: 'response_received',
        dueAt: null,
        updatedAt: clock,
        messages: [...caseObj.messages, inqMsg],
        events: [...caseObj.events, inqEvent],
      };
    }

    if (msgCount === 3) {
      // Step 4: Stakeholder partial answer
      const partialMsg: CaseMessage = {
        id: `MSG-${caseObj.id}-r1-m4`,
        caseId: caseObj.id,
        episodeId: episode.id,
        threadId: `TH-${caseObj.id}`,
        round: caseObj.currentRound,
        inReplyToMessageId: caseObj.messages.find(m => m.id.endsWith('-r1-m3'))?.id || null,
        senderRole: 'stakeholder',
        senderName: getFaskesContactName(episode),
        senderAddress: FASKES_EMAIL,
        recipientName: OFFICER_NAME,
        recipientAddress: OFFICER_EMAIL,
        subject: flow.stakeholderPartialReply.subject,
        body: flow.stakeholderPartialReply.body,
        direction: 'inbound',
        status: 'received_simulated',
        createdAt: clock,
        attachmentReportIds: [],
      };

      const partialEvent: CaseEvent = {
        id: `EVT-${caseObj.id}-${caseObj.events.length}-part`,
        caseId: caseObj.id,
        episodeId: episode.id,
        type: 'message_received',
        occurredAt: clock,
        mode: 'simulation',
        relatedMessageId: partialMsg.id,
        detail: 'Tanggapan faskes belum lengkap; kendala jalan belum dirinci (Simulasi).',
      };

      return {
        ...caseObj,
        status: 'followup_required',
        dueAt: null,
        updatedAt: clock,
        messages: [...caseObj.messages, partialMsg],
        events: [...caseObj.events, partialEvent],
        missingItems: [
          'Rincian kendala akses jalan fisik spesifik pada koridor alternatif',
          'Konfirmasi status faskes pembanding terdekat saat tanggal rujukan',
        ],
        summary: {
          questionAsked: 'Alasan pemilihan faskes tujuan dan konfirmasi kendala faskes pembanding.',
          stakeholderResponse: 'Hanya menyatakan pertimbangan aksesibilitas secara umum.',
          completeItems: ['Tanggapan awal dari faskes telah tercatat'],
          missingItems: [
            'Rincian kendala akses jalan fisik spesifik pada koridor alternatif',
            'Konfirmasi status faskes pembanding terdekat saat tanggal rujukan',
          ],
          recommendation: 'Diperlukan pertanyaan lanjutan spesifik mengenai kendala jalan dan status pembanding.',
          updatedAt: clock,
        },
      };
    }

    if (msgCount >= 5) {
      // Step 7: Final complete follow-up answer
      const finalMsg: CaseMessage = {
        id: `MSG-${caseObj.id}-r2-m6`,
        caseId: caseObj.id,
        episodeId: episode.id,
        threadId: `TH-${caseObj.id}`,
        round: caseObj.currentRound,
        inReplyToMessageId: caseObj.messages.find(m => m.id.endsWith('-r2-m5'))?.id || null,
        senderRole: 'stakeholder',
        senderName: getFaskesContactName(episode),
        senderAddress: FASKES_EMAIL,
        recipientName: OFFICER_NAME,
        recipientAddress: OFFICER_EMAIL,
        subject: flow.stakeholderFinalReply.subject,
        body: flow.stakeholderFinalReply.body,
        direction: 'inbound',
        status: 'received_simulated',
        createdAt: clock,
        attachmentReportIds: [],
      };

      const finalEvent: CaseEvent = {
        id: `EVT-${caseObj.id}-${caseObj.events.length}-fin`,
        caseId: caseObj.id,
        episodeId: episode.id,
        type: 'message_received',
        occurredAt: clock,
        mode: 'simulation',
        relatedMessageId: finalMsg.id,
        detail: 'Kelengkapan dokumen telaah lanjutan diterima (Simulasi).',
      };

      return {
        ...caseObj,
        status: 'ready_for_review',
        updatedAt: clock,
        dueAt: null,
        messages: [...caseObj.messages, finalMsg],
        events: [...caseObj.events, finalEvent],
        missingItems: [],
        summary: {
          ...flow.finalSummary,
          updatedAt: clock,
        },
      };
    }
  }

  if (caseObj.fixtureId === 'no_response') {
    // Belated reply
    const rem = getNoResponseFlowReminders(episode);
    const belatedMsg: CaseMessage = {
      id: `MSG-${caseObj.id}-belated`,
      caseId: caseObj.id,
      episodeId: episode.id,
      threadId: `TH-${caseObj.id}`,
      round: 1,
      inReplyToMessageId: caseObj.messages[0]?.id || null,
      senderRole: 'stakeholder',
      senderName: getFaskesContactName(episode),
      senderAddress: FASKES_EMAIL,
      recipientName: OFFICER_NAME,
      recipientAddress: OFFICER_EMAIL,
      subject: rem.belatedResponse.subject,
      body: rem.belatedResponse.body,
      direction: 'inbound',
      status: 'received_simulated',
      createdAt: clock,
      attachmentReportIds: [],
    };

    const belatedEvent: CaseEvent = {
      id: `EVT-${caseObj.id}-${caseObj.events.length}-belated`,
      caseId: caseObj.id,
      episodeId: episode.id,
      type: 'message_received',
      occurredAt: clock,
      mode: 'simulation',
      relatedMessageId: belatedMsg.id,
      detail: 'Tanggapan faskes terlambat diterima setelah masa pengingat (Simulasi).',
    };

    return {
      ...caseObj,
      status: 'ready_for_review',
      updatedAt: clock,
      dueAt: null,
      messages: [...caseObj.messages, belatedMsg],
      events: [...caseObj.events, belatedEvent],
      summary: {
        ...rem.belatedSummary,
        updatedAt: clock,
      },
    };
  }

  return caseObj;
}

/**
 * Step 3 in Followup Flow: Agent answers stakeholder's question about alternative facility
 */
export function simulateAgentInquiryReply(
  caseObj: ClarificationCase,
  episode: Episode
): ClarificationCase {
  if (caseObj.fixtureId !== 'followup' || caseObj.status !== 'response_received' || episode.id !== caseObj.episodeId) return caseObj;
  const clock = caseObj.simulationClock;
  const flow = getFollowupFlowResponses(episode);

  const agentMsg: CaseMessage = {
    id: `MSG-${caseObj.id}-r1-m3`,
    caseId: caseObj.id,
    episodeId: episode.id,
    threadId: `TH-${caseObj.id}`,
    round: caseObj.currentRound + 1,
    inReplyToMessageId: caseObj.messages.find(m => m.id.endsWith('-r1-m2'))?.id || null,
    senderRole: 'agent',
    senderName: AGENT_NAME,
    senderAddress: AGENT_EMAIL,
    recipientName: `Staf Administrasi Rujukan ${episode.fromName}`,
    recipientAddress: FASKES_EMAIL,
    subject: flow.agentClarification.subject,
    body: flow.agentClarification.body,
    direction: 'outbound',
    status: 'sent_simulated',
    createdAt: clock,
    attachmentReportIds: [],
  };

  const newEvent: CaseEvent = {
    id: `EVT-${caseObj.id}-${caseObj.events.length}-agtreply`,
    caseId: caseObj.id,
    episodeId: episode.id,
    type: 'message_sent',
    occurredAt: clock,
    mode: 'simulation',
    relatedMessageId: agentMsg.id,
    detail: 'Agen SIGARA menjawab pertanyaan faskes dengan rincian pembanding (Simulasi).',
  };

  return {
    ...caseObj,
    status: 'awaiting_response',
    currentRound: caseObj.currentRound + 1,
    dueAt: addDaysToIso(clock, 2),
    reminderCount: 0,
    updatedAt: clock,
    messages: [...caseObj.messages, agentMsg],
    events: [...caseObj.events, newEvent],
  };
}

/**
 * Step 6 in Followup Flow: Send follow-up question (Kirim Pertanyaan Lanjutan)
 */
export function simulateSendFollowup(
  caseObj: ClarificationCase,
  episode: Episode
): ClarificationCase {
  if (caseObj.status !== 'followup_required' || episode.id !== caseObj.episodeId) return caseObj;
  const clock = caseObj.simulationClock;
  const due = addDaysToIso(clock, 2);
  const flow = getFollowupFlowResponses(episode);

  const followupMsg: CaseMessage = {
    id: `MSG-${caseObj.id}-r2-m5`,
    caseId: caseObj.id,
    episodeId: episode.id,
    threadId: `TH-${caseObj.id}`,
    round: caseObj.currentRound + 1,
    inReplyToMessageId: caseObj.messages[caseObj.messages.length - 1]?.id || null,
    senderRole: 'officer',
    senderName: OFFICER_NAME,
    senderAddress: OFFICER_EMAIL,
    recipientName: getFaskesContactName(episode),
    recipientAddress: FASKES_EMAIL,
    subject: flow.followupQuestion.subject,
    body: flow.followupQuestion.body,
    direction: 'outbound',
    status: 'sent_simulated',
    createdAt: clock,
    attachmentReportIds: [caseObj.reportId],
  };

  const newEvent: CaseEvent = {
    id: `EVT-${caseObj.id}-${caseObj.events.length}-folreq`,
    caseId: caseObj.id,
    episodeId: episode.id,
    type: 'followup_requested',
    occurredAt: clock,
    mode: 'simulation',
    relatedMessageId: followupMsg.id,
    detail: 'Pertanyaan klarifikasi lanjutan putaran ke-2 terkirim (Simulasi).',
  };

  return {
    ...caseObj,
    status: 'awaiting_response',
    currentRound: caseObj.currentRound + 1,
    reminderCount: 0,
    dueAt: due,
    updatedAt: clock,
    messages: [...caseObj.messages, followupMsg],
    events: [...caseObj.events, newEvent],
  };
}

/**
 * Advance simulation time with strict reminder & escalation evaluator.
 * Safe from infinite loops and double-reminder triggers.
 */
export function advanceSimulationTime(
  caseObj: ClarificationCase,
  daysToAdd: number,
  episode: Episode
): ClarificationCase {
  if (caseObj.status === 'closed' || episode.id !== caseObj.episodeId) return caseObj;
  if (!Number.isFinite(daysToAdd) || daysToAdd <= 0) return caseObj;

  const oldClock = caseObj.simulationClock;
  const targetClock = addDaysToIso(oldClock, daysToAdd);

  let current = { ...caseObj, simulationClock: targetClock, updatedAt: targetClock };

  // If awaiting response and has a due date, evaluate reminders
  if (current.status === 'awaiting_response' && current.dueAt) {
    let guard = 0;
    while (
      new Date(current.simulationClock).getTime() >= new Date(current.dueAt!).getTime() &&
      current.status === 'awaiting_response' &&
      guard++ < 5
    ) {
      const reminders = getNoResponseFlowReminders(episode);
      const reminderIndex = current.reminderCount + 1;

      if (reminderIndex === 1) {
        // Send Reminder 1
        const r1Msg: CaseMessage = {
          id: `MSG-${current.id}-r${current.currentRound}-rem1`,
          caseId: current.id,
          episodeId: episode.id,
          threadId: `TH-${current.id}`,
          round: current.currentRound,
          inReplyToMessageId: [...current.messages].reverse().find(m => m.direction === 'outbound' && !m.id.includes('-rem'))?.id || null,
          senderRole: 'agent',
          senderName: AGENT_NAME,
          senderAddress: AGENT_EMAIL,
          recipientName: getFaskesContactName(episode),
          recipientAddress: FASKES_EMAIL,
          subject: reminders.reminder1.subject,
          body: `${reminders.reminder1.body}\n\nReferensi kasus: ${current.id}. Permintaan belum dijawab: ${[...current.messages].reverse().find(m => m.direction === 'outbound' && !m.id.includes('-rem'))?.id || '-'}. Putaran ${current.currentRound}.`,
          direction: 'outbound',
          status: 'sent_simulated',
          createdAt: current.dueAt!,
          attachmentReportIds: [current.reportId],
        };

        const r1Event: CaseEvent = {
          id: `EVT-${current.id}-r${current.currentRound}-rem1`,
          caseId: current.id,
          episodeId: episode.id,
          type: 'reminder_sent',
          occurredAt: current.dueAt!,
          mode: 'simulation',
          relatedMessageId: r1Msg.id,
          detail: 'Pengingat pertama (1/2) dikirim otomatis oleh agen (Simulasi).',
        };

        current = {
          ...current,
          reminderCount: 1,
          dueAt: addDaysToIso(current.dueAt!, 2),
          messages: [...current.messages, r1Msg],
          events: [...current.events, r1Event],
        };
      } else if (reminderIndex === 2) {
        // Send Reminder 2
        const r2Msg: CaseMessage = {
          id: `MSG-${current.id}-r${current.currentRound}-rem2`,
          caseId: current.id,
          episodeId: episode.id,
          threadId: `TH-${current.id}`,
          round: current.currentRound,
          inReplyToMessageId: [...current.messages].reverse().find(m => m.direction === 'outbound' && !m.id.includes('-rem'))?.id || null,
          senderRole: 'agent',
          senderName: AGENT_NAME,
          senderAddress: AGENT_EMAIL,
          recipientName: getFaskesContactName(episode),
          recipientAddress: FASKES_EMAIL,
          subject: reminders.reminder2.subject,
          body: `${reminders.reminder2.body}\n\nReferensi kasus: ${current.id}. Permintaan belum dijawab: ${[...current.messages].reverse().find(m => m.direction === 'outbound' && !m.id.includes('-rem'))?.id || '-'}. Putaran ${current.currentRound}.`,
          direction: 'outbound',
          status: 'sent_simulated',
          createdAt: current.dueAt!,
          attachmentReportIds: [current.reportId],
        };

        const r2Event: CaseEvent = {
          id: `EVT-${current.id}-r${current.currentRound}-rem2`,
          caseId: current.id,
          episodeId: episode.id,
          type: 'reminder_sent',
          occurredAt: current.dueAt!,
          mode: 'simulation',
          relatedMessageId: r2Msg.id,
          detail: 'Pengingat kedua (2/2) dikirim otomatis oleh agen (Simulasi).',
        };

        current = {
          ...current,
          reminderCount: 2,
          dueAt: addDaysToIso(current.dueAt!, 2),
          messages: [...current.messages, r2Msg],
          events: [...current.events, r2Event],
        };
      } else {
        // Exceeded 2 reminders: Escalate to officer
        const escEvent: CaseEvent = {
          id: `EVT-${current.id}-r${current.currentRound}-escalated`,
          caseId: current.id,
          episodeId: episode.id,
          type: 'escalated',
          occurredAt: current.dueAt!,
          mode: 'simulation',
          detail: 'Batas maksimum 2 pengingat tercapai tanpa tanggapan. Kasus dieskalasi ke petugas.',
        };

        current = {
          ...current,
          status: 'escalated',
          dueAt: null,
          events: [...current.events, escEvent],
        };
        break;
      }
    }
  }

  return current;
}

/**
 * Advance clock directly to the next due date
 */
export function advanceToNextDue(
  caseObj: ClarificationCase,
  episode: Episode
): ClarificationCase {
  if (!caseObj.dueAt || caseObj.status === 'closed') return caseObj;
  const currentMs = new Date(caseObj.simulationClock).getTime();
  const dueMs = new Date(caseObj.dueAt).getTime();
  const diffDays = Math.max(1, Math.ceil((dueMs - currentMs) / (24 * 60 * 60 * 1000)));
  return advanceSimulationTime(caseObj, diffDays, episode);
}

/**
 * Officer review & closure action
 */
export function closeCase(
  caseObj: ClarificationCase,
  closureReason: ClosureReason,
  closureNotes: string,
  closedBy: string = 'Petugas Verifikator SIGARA'
): ClarificationCase {
  if (!['ready_for_review', 'escalated'].includes(caseObj.status) || !closureNotes.trim()) return caseObj;
  const clock = caseObj.simulationClock;

  const closeEvent: CaseEvent = {
    id: `EVT-${caseObj.id}-closed-${caseObj.events.length}`,
    caseId: caseObj.id,
    episodeId: caseObj.episodeId,
    type: 'case_closed',
    occurredAt: clock,
    mode: 'simulation',
    detail: `Kasus diselesaikan oleh petugas. Keputusan: ${closureReason}. Catatan: ${closureNotes}`,
  };

  return {
    ...caseObj,
    status: 'closed',
    updatedAt: clock,
    closedAt: clock,
    closureReason,
    closureNotes,
    closedBy,
    dueAt: null,
    events: [...caseObj.events, closeEvent],
  };
}

/**
 * Reset case back to initial draft state
 */
export function resetCase(caseObj: ClarificationCase, episode: Episode): ClarificationCase {
  return createClarificationCase(episode, caseObj.fixtureId, caseObj.reportId, DEFAULT_SIMULATION_START);
}

// ============================================================================
// STORAGE & MULTI-CASE CACHING
// ============================================================================

export function loadAllClarificationCases(): Record<string, ClarificationCase> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = readDemoStorage(CLARIFICATION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(Object.entries(parsed).filter(([id, raw]) => {
        const c = raw as ClarificationCase;
        return c && c.mode === 'simulation' && c.episodeId === id && Array.isArray(c.messages) && Array.isArray(c.events) && Number.isFinite(Date.parse(c.simulationClock));
      })) as Record<string, ClarificationCase>;
    }
  } catch {
    // Return empty on parse failure
  }
  return {};
}

export function saveClarificationCase(caseObj: ClarificationCase): void {
  if (typeof window === 'undefined') return;
  try {
    const all = loadAllClarificationCases();
    all[caseObj.episodeId] = caseObj;
    writeDemoStorage(CLARIFICATION_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event('sigara-demo-change'));
  } catch (err) {
    console.warn('Failed to save clarification case:', err);
  }
}

export function deleteClarificationCase(episodeId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const all = loadAllClarificationCases();
    delete all[episodeId];
    writeDemoStorage(CLARIFICATION_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event('sigara-demo-change'));
  } catch (err) {
    console.warn('Failed to delete clarification case:', err);
  }
}

export function getCaseForEpisode(episodeId: string): ClarificationCase | null {
  const all = loadAllClarificationCases();
  return all[episodeId] || null;
}

export type ClarificationAggregates = {
  totalCases: number;
  awaitingCount: number;
  receivedCount: number;
  escalatedCount: number;
  closedCount: number;
  outboundSimulatedCount: number;
  inboundSimulatedCount: number;
  remindersSentCount: number;
};

export function getClarificationAggregates(
  cases: Record<string, ClarificationCase>
): ClarificationAggregates {
  const list = Object.values(cases);

  let awaiting = 0;
  let received = 0;
  let escalated = 0;
  let closed = 0;
  let outbound = 0;
  let inbound = 0;
  let reminders = 0;

  list.forEach((c) => {
    if (c.status === 'awaiting_response') awaiting++;
    if (c.messages.some(m => m.direction === 'inbound' && m.status === 'received_simulated')) received++;
    if (c.status === 'escalated') escalated++;
    if (c.status === 'closed') closed++;

    c.messages.forEach((m) => {
      if (m.direction === 'outbound' && m.status === 'sent_simulated') outbound++;
      if (m.direction === 'inbound') inbound++;
    });

    c.events.forEach((e) => {
      if (e.type === 'reminder_sent') reminders++;
    });
  });

  return {
    totalCases: list.length,
    awaitingCount: awaiting,
    receivedCount: received,
    escalatedCount: escalated,
    closedCount: closed,
    outboundSimulatedCount: outbound,
    inboundSimulatedCount: inbound,
    remindersSentCount: reminders,
  };
}
