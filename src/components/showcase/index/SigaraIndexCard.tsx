'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, ExternalLink, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import type { EpisodeIndexExplanation } from '@/lib/sigara-index-types';
import { PILLARS } from '@/lib/sigara-index-sources';
import { formatNumber } from '@/lib/showcase';

type Props = {
  explanation: EpisodeIndexExplanation;
  compact?: boolean;
  onToggleMode?: (nextMode: 'master' | 'multipillar_demo') => void;
  investigationHref?: string;
  onClose?: () => void;
};

export default function SigaraIndexCard({
  explanation,
  compact = false,
  onToggleMode,
  investigationHref,
  onClose,
}: Props) {
  const {
    score,
    masterScore,
    category,
    categoryLabel,
    modelVersion,
    mode,
    statusNote,
    pillars,
    masterReconstruction,
    isSimulatedDemo,
  } = explanation;

  const scoreText = score != null ? score.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—';
  const isCalculable = score !== null;

  if (compact) {
    return (
      <aside className="sigara-index-card-compact" aria-label="Ringkasan SIGARA Index Episode">
        <div className="card-top-header">
          <div className="badge-group">
            <span className="sg-kicker">SIGARA Index</span>
            <span className={`sg-cat-badge ${category}`}>
              <i className="dot" />
              {categoryLabel}
            </span>
            {isSimulatedDemo && <span className="sg-demo-pill">Simulasi v2</span>}
          </div>
          {onClose && (
            <button type="button" className="close-btn" onClick={onClose} aria-label="Tutup panel ringkas episode">
              ×
            </button>
          )}
        </div>

        <div className="card-score-row">
          <div className={`score-display ${category} ${!isCalculable ? 'uncalculated' : ''}`}>
            <span className="score-num">{scoreText}</span>
            <span className="score-denom">/ 100</span>
          </div>
          <div className="score-meta">
            <span className="model-tag">{modelVersion}</span>
            <p className="note-text">{statusNote}</p>
          </div>
        </div>

        {/* Compact Pillar Status / Contributions */}
        <div className="compact-pillars" aria-label="Status pilar penelaahan">
          <div className="compact-pillars-grid">
            {pillars.map((p) => {
              const meta = PILLARS[p.id];
              const hasScore = p.score !== null;
              return (
                <div key={p.id} className="pillar-tile" style={{ borderLeftColor: meta.color }}>
                  <div className="tile-head">
                    <span className="tile-title">{meta.shortName}</span>
                    <strong className="tile-val">
                      {hasScore ? `${p.score!.toFixed(0)}` : 'Belum ada'}
                    </strong>
                  </div>
                  {p.contributionPoints !== null && (
                    <span className="tile-contrib">+{p.contributionPoints.toFixed(1)} pt</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {investigationHref && (
          <Link href={investigationHref} className="cta-link-button">
            <span>Lihat rincian indeks &amp; aliran data</span>
            <ArrowRight size={15} />
          </Link>
        )}
      </aside>
    );
  }

  // Full Mode (for Episode Investigation page)
  return (
    <div className="sigara-index-card-full" aria-label="Kartu SIGARA Index Lengkap">
      <div className="card-header-bar">
        <div className="title-block">
          <span className="sg-kicker">MODEL PENELAAHAN PRIORITAS RUJUKAN</span>
          <div className="h-group">
            <h3>SIGARA Index per Episode</h3>
            <span className={`sg-cat-badge ${category}`}>
              <i className="dot" />
              {categoryLabel}
            </span>
          </div>
        </div>

        {/* Model Mode Switcher */}
        {onToggleMode && (
          <div className="mode-toggle-group" role="group" aria-label="Pilih model perhitungan indeks">
            <button
              type="button"
              className={`mode-btn ${mode === 'master' ? 'active' : ''}`}
              aria-pressed={mode === 'master'}
              onClick={() => onToggleMode('master')}
            >
              Data Master (v1.0)
            </button>
            <button
              type="button"
              className={`mode-btn ${mode === 'multipillar_demo' ? 'active' : ''}`}
              aria-pressed={mode === 'multipillar_demo'}
              onClick={() => onToggleMode('multipillar_demo')}
            >
              <Sparkles size={13} />
              Simulasi Multipilar (v2.0)
            </button>
          </div>
        )}
      </div>

      <div className="card-main-body">
        <div className="main-score-box">
          <div className="score-wrap">
            <div className={`score-large ${category} ${!isCalculable ? 'uncalculated' : ''}`}>
              <span className="value">{scoreText}</span>
              <span className="max-tag">/ 100</span>
            </div>
            <div className="meta-block">
              <span className="version-pill">{modelVersion}</span>
              <p className="disclaimer-p">
                {isSimulatedDemo
                  ? 'Simulasi model multipilar (demonstrasi POC) — bukan hasil validasi penetapan kecurangan definitif.'
                  : 'Skor prioritas penelaahan master simulasi berdasarkan proksi aksesibilitas & fasilitas alternatif.'}
              </p>
            </div>
          </div>

          {/* Master breakdown explanation if in master mode */}
          {mode === 'master' && masterReconstruction && (
            <div className="master-reconstruction-box">
              <div className="recon-head">
                <span className="recon-title">Formula Pembentuk Skor Master:</span>
                <span className="tolerance-tag">{masterReconstruction.roundingTolerance}</span>
              </div>
              <div className="formula-chips">
                <div className="chip">
                  <span>Nilai Dasar Aturan</span>
                  <strong>+{masterReconstruction.basePoints.toFixed(1)} pt</strong>
                </div>
                <div className="chip">
                  <span>Tambahan Waktu (Maks 45)</span>
                  <strong>+{masterReconstruction.timePoints.toFixed(1)} pt</strong>
                </div>
                <div className="chip">
                  <span>Rasio Waktu (Maks 35)</span>
                  <strong>+{masterReconstruction.ratioPoints.toFixed(1)} pt</strong>
                </div>
                {masterReconstruction.continuityDiscountApplied && (
                  <div className="chip discount">
                    <span>Pengurang Kontinuitas</span>
                    <strong>× 0,4 (Maks 45 pt)</strong>
                  </div>
                )}
              </div>
              <p className="recon-note">
                Skor master maksimal bernilai 90 sebelum pengurang. GeoAI berstatus ilustrasi dan belum memengaruhi rumus master lama.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
