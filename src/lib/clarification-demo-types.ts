/**
 * Data contracts for Two-Way Clarification Simulation (POC)
 * Strictly simulated: dummy stakeholder communications and automated agent follow-up.
 */

export type CaseStatus =
  | 'draft'
  | 'awaiting_response'
  | 'response_received'
  | 'followup_required'
  | 'ready_for_review'
  | 'escalated'
  | 'closed';

export type FixtureId = 'complete' | 'followup' | 'no_response';

export type MessageSenderRole = 'officer' | 'agent' | 'stakeholder';
export type MessageDirection = 'inbound' | 'outbound' | 'internal';
export type MessageStatus = 'draft' | 'sent_simulated' | 'received_simulated';

export type CaseMessage = {
  id: string;
  caseId: string;
  episodeId: string;
  threadId: string;
  round: number;
  inReplyToMessageId?: string | null;
  senderRole: MessageSenderRole;
  senderName: string;
  senderAddress: string;
  recipientName: string;
  recipientAddress: string;
  subject: string;
  body: string;
  direction: MessageDirection;
  status: MessageStatus;
  createdAt: string; // ISO string
  attachmentReportIds: string[];
};

export type CaseEventType =
  | 'case_created'
  | 'message_sent'
  | 'message_received'
  | 'reminder_sent'
  | 'escalated'
  | 'case_closed'
  | 'time_advanced'
  | 'followup_requested';

export type CaseEvent = {
  id: string;
  caseId: string;
  episodeId: string;
  type: CaseEventType;
  occurredAt: string; // ISO string
  mode: 'simulation';
  relatedMessageId?: string | null;
  detail: string;
};

export type CaseSummary = {
  questionAsked: string;
  stakeholderResponse: string;
  completeItems: string[];
  missingItems: string[];
  recommendation: string;
  updatedAt: string; // ISO string
};

export type ClosureReason = 'sufficient' | 'further_study' | 'unresponsive_escalated';

export type ClarificationCase = {
  id: string; // e.g. CASE-290411124Y000018
  episodeId: string;
  reportId: string;
  mode: 'simulation';
  fixtureId: FixtureId;
  status: CaseStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  dueAt: string | null; // ISO string
  simulationClock: string; // ISO string
  reminderCount: number; // 0, 1, 2
  maxReminders: number; // 2
  currentRound: number; // 1, 2...
  messages: CaseMessage[];
  events: CaseEvent[];
  summary?: CaseSummary | null;
  missingItems?: string[];
  closedAt?: string | null;
  closureReason?: ClosureReason | null;
  closureNotes?: string | null;
  closedBy?: string | null;
};
