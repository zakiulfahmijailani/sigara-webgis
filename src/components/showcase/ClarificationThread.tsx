'use client';
import React from 'react';
import {
  FileText,
  Mail,
  User,
  Bot,
  Send,
  CornerDownRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Bell,
  ShieldAlert,
} from 'lucide-react';
import type { CaseMessage, CaseEvent } from '@/lib/clarification-demo-types';
import { formatSimDateTime } from '@/lib/clarification-demo';

type Props = {
  messages: CaseMessage[];
  events: CaseEvent[];
  onOpenReport?: (reportId: string) => void;
};

export default function ClarificationThread({ messages, events, onOpenReport }: Props) {
  // Merge messages and events in chronological sequence
  type TimelineItem =
    | { type: 'message'; data: CaseMessage; time: string }
    | { type: 'event'; data: CaseEvent; time: string };

  const timeline: TimelineItem[] = [];

  messages.forEach((m) => {
    timeline.push({ type: 'message', data: m, time: m.createdAt });
  });

  events.forEach((e) => {
    // Only show system timeline events that are not direct 1:1 message sends
    if (e.type === 'reminder_sent' || e.type === 'escalated' || e.type === 'case_closed') {
      timeline.push({ type: 'event', data: e, time: e.occurredAt });
    }
  });

  timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return (
    <div className="clarification-thread" aria-label="Riwayat percakapan klarifikasi dua arah">
      <div className="thread-timeline">
        {timeline.map((item, idx) => {
          if (item.type === 'event') {
            const ev = item.data;
            return (
              <div key={ev.id} className={`thread-event-badge event-${ev.type}`}>
                {ev.type === 'reminder_sent' && <Bell size={13} />}
                {ev.type === 'escalated' && <ShieldAlert size={13} />}
                {ev.type === 'case_closed' && <CheckCircle2 size={13} />}
                <span>{ev.detail}</span>
                <span className="event-time">({formatSimDateTime(ev.occurredAt)})</span>
              </div>
            );
          }

          const msg = item.data;
          const isOutbound = msg.direction === 'outbound';
          const isAgent = msg.senderRole === 'agent';

          return (
            <article
              key={msg.id}
              className={`thread-message-card ${msg.direction} role-${msg.senderRole}`}
            >
              <div className="msg-header">
                <div className="msg-sender-info">
                  <div className="sender-avatar">
                    {msg.senderRole === 'agent' ? (
                      <Bot size={16} />
                    ) : msg.senderRole === 'officer' ? (
                      <User size={16} />
                    ) : (
                      <Mail size={16} />
                    )}
                  </div>
                  <div>
                    <div className="sender-name-row">
                      <strong>{msg.senderName}</strong>
                      <span className="sender-email">&lt;{msg.senderAddress}&gt;</span>
                      <span className="role-tag">{msg.senderRole.toUpperCase()}</span>
                    </div>
                    <div className="msg-recipient">
                      Kepada: <span>{msg.recipientName}</span> &lt;{msg.recipientAddress}&gt;
                    </div>
                  </div>
                </div>

                <div className="msg-meta-right">
                  <span className={`msg-status-pill status-${msg.status}`}>
                    {msg.status === 'draft' && 'Draf (Belum Terkirim)'}
                    {msg.status === 'sent_simulated' && 'Terkirim (simulasi)'}
                    {msg.status === 'received_simulated' && 'Diterima (simulasi)'}
                  </span>
                  <time className="msg-date" dateTime={msg.createdAt}>
                    {formatSimDateTime(msg.createdAt)}
                  </time>
                </div>
              </div>

              <div className="msg-subject">
                <h4>{msg.subject}</h4>
              </div>

              <div className="msg-body">
                {msg.body.split('\n\n').map((paragraph, pIdx) => (
                  <p key={pIdx}>{paragraph}</p>
                ))}
              </div>

              {msg.attachmentReportIds.length > 0 && onOpenReport && (
                <div className="msg-attachments">
                  <span className="attachment-label">Lampiran Dokumen Telaah:</span>
                  {msg.attachmentReportIds.map((rptId) => (
                    <button
                      key={rptId}
                      type="button"
                      className="attachment-btn"
                      onClick={() => onOpenReport(rptId)}
                    >
                      <FileText size={13} />
                      <span>{rptId} (Buka &amp; Cetak)</span>
                    </button>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
