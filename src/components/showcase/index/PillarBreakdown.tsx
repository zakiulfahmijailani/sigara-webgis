'use client';
import React from 'react';
import type { IndexPillar } from '@/lib/sigara-index-types';
import { PILLARS } from '@/lib/sigara-index-sources';
import { Info, AlertCircle, CheckCircle2 } from 'lucide-react';

type Props = {
  pillars: IndexPillar[];
  mode: 'master' | 'multipillar_demo';
};

export default function PillarBreakdown({ pillars, mode }: Props) {
  return (
    <section className="pillar-breakdown-section" aria-label="Rincian 4 Pilar Penelaahan">
      <div className="section-head">
        <div>
          <h3>Rincian Empat Pilar Penelaahan</h3>
          <p className="subtext">
            {mode === 'multipillar_demo'
              ? 'Skor pilar (0–100) dikalikan bobot konfigurasi untuk membentuk kontribusi poin final.'
              : 'Status transparansi pilar pada model master. Pilar yang belum dimasukkan ke rumus master ditandai secara jujur.'}
          </p>
        </div>
        <div className="legend-notice">
          <Info size={13} />
          <span>Arah pilar: semakin tinggi = semakin perlu ditelaah kewajarannya</span>
        </div>
      </div>

      <div className="pillars-grid">
        {pillars.map((pillar) => {
          const meta = PILLARS[pillar.id];
          const hasScore = pillar.score !== null && pillar.score !== undefined;
          const scorePercent = hasScore ? Math.max(0, Math.min(100, pillar.score!)) : 0;
          const weightPercent = Math.round(pillar.weight * 100);

          return (
            <div key={pillar.id} className="pillar-card" style={{ borderTopColor: meta.color }}>
              <div className="pillar-card-head">
                <div className="pillar-title-wrap">
                  <span className="pillar-indicator-dot" style={{ backgroundColor: meta.color }} />
                  <div>
                    <h4>{meta.name}</h4>
                    <span className="pillar-desc">{meta.description}</span>
                  </div>
                </div>

                {hasScore ? (
                  <div className="pillar-score-badge">
                    <span className="score-value">{pillar.score!.toFixed(1)}</span>
                    <span className="score-denom">/ 100</span>
                  </div>
                ) : (
                  <span className="pillar-unavail-badge">Belum dihitung</span>
                )}
              </div>

              {/* Progress Track */}
              <div className="progress-track" aria-hidden="true">
                <div
                  className="progress-fill"
                  style={{
                    width: `${scorePercent}%`,
                    backgroundColor: meta.color,
                    opacity: hasScore ? 1 : 0.2,
                  }}
                />
              </div>

              {/* Math / Contribution Row */}
              <div className="pillar-footer">
                <div className="weight-box">
                  <span className="footer-label">Bobot Model:</span>
                  <strong>{pillar.weight > 0 ? `${weightPercent}%` : '—'}</strong>
                </div>

                <div className="contrib-box">
                  <span className="footer-label">Kontribusi Skor:</span>
                  <strong style={{ color: hasScore ? meta.color : undefined }}>
                    {pillar.contributionPoints !== null
                      ? `+${pillar.contributionPoints.toFixed(1)} pt`
                      : '—'}
                  </strong>
                </div>
              </div>

              {/* Status Note */}
              <div className="pillar-status-note">
                <span className="status-text">{pillar.statusLabel}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
