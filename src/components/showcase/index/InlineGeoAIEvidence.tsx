'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  Sparkles,
  Maximize2,
  X,
  Info,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Episode } from '@/lib/showcase';
import type { IndexPillar } from '@/lib/sigara-index-types';
import {
  getEvidenceForEpisode,
  getEpisodeEvidenceScenario,
  getEpisodeGeoAIStatus,
  getShowcaseEvidenceForEpisode,
  type GeneratedEpisodeEvidence,
  type GeoAIStatusInfo,
} from '@/lib/geoai-evidence-v4';
import { dateLabel } from '@/lib/showcase';

type Props = {
  episode: Episode;
  geoaiPillar?: IndexPillar | null;
  mode?: 'master' | 'multipillar_demo';
};

export default function InlineGeoAIEvidence({
  episode,
  geoaiPillar,
  mode = 'master',
}: Props) {
  const [selectedScenario, setSelectedScenario] = useState<'A' | 'B'>('A');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const zoomButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Reset scenario to A whenever episode changes
  useEffect(() => {
    setSelectedScenario('A');
    setLightboxOpen(false);
    setFailedImageUrl(null);
  }, [episode.id]);

  // Pair existing illustrations with high-risk episodes without changing source metadata.
  const assignment = getShowcaseEvidenceForEpisode(episode);
  const evidenceList = assignment?.items || [];
  const hasEvidence = evidenceList.length > 0;

  // Active evidence item for selected scenario
  const activeEvidence = hasEvidence
    ? evidenceList.find((e) => e.scenario === selectedScenario) || evidenceList[0]
    : null;

  // Status computation
  const statusInfo: GeoAIStatusInfo = getEpisodeGeoAIStatus(episode, activeEvidence);

  // Handle ESC key for Lightbox
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxOpen) {
        setLightboxOpen(false);
        zoomButtonRef.current?.focus();
      }
    },
    [lightboxOpen]
  );

  useEffect(() => {
    if (lightboxOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus close button inside lightbox
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, handleKeyDown]);

  const handleOpenLightbox = () => {
    setLightboxOpen(true);
  };

  const handleCloseLightbox = () => {
    setLightboxOpen(false);
    zoomButtonRef.current?.focus();
  };

  const kindLabels: Record<string, string> = {
    banjir: 'Analisis Genangan / Banjir (MNDWI)',
    longsor: 'Analisis Rintangan / Longsor (ΔNDVI)',
    kebakaran: 'Analisis Area Terbakar / Kebakaran (ΔNBR)',
    pembanding: 'Observasi Pembanding / Verifikasi Baseline',
  };

  // Per showcase policy, medium/low episodes do not display an illustration section.
  if (episode.cat !== 'TINGGI_SIM') return null;

  return (
    <section
      id="geoai-evidence"
      className="inline-geoai-section"
      aria-label="Bukti GeoAI Episode Ini"
    >
      <div className="geoai-section-header">
        <div className="section-title-wrap">
          <div className="kicker-row">
            <span className="geoai-kicker">BUKTI PENGINDERAAN JAUH</span>
            <span className="geoai-sim-badge">
              <Sparkles size={11} />
              SIMULASI POC · ILUSTRASI GENERATIF v4
            </span>
            <span className={`geoai-status-pill ${statusInfo.status}`}>
              {statusInfo.badgeLabel}
            </span>
          </div>
          <h3 className="section-title">Bukti GeoAI Episode Ini</h3>
          <p className="section-subtitle">
            Ilustrasi analisis spasial untuk menelaah konteks akses rujukan pada episode terpilih.
          </p>
          {assignment?.isReassigned && (
            <p className="section-subtitle">
              Contoh skenario dipilih secara acak tetap untuk episode {episode.id}.
              {' '}ID, wilayah, dan tanggal di dalam gambar mengikuti skenario asal
              {' '}{assignment.sourceEpisodeId}; gambar ini bukan hasil analisis aktual episode yang dibuka.
            </p>
          )}
        </div>
      </div>

      {hasEvidence && activeEvidence ? (
        <div className="geoai-evidence-card">
          {/* Top metadata strip */}
          <div className="evidence-meta-strip">
            <div className="meta-item">
              <span className="meta-label">Wilayah Skenario Gambar:</span>
              <strong>
                <MapPin size={12} />
                {activeEvidence.region} ({activeEvidence.packageId})
              </strong>
            </div>
            <div className="meta-item">
              <span className="meta-label">Jenis Analisis:</span>
              <strong>{kindLabels[activeEvidence.kind] || activeEvidence.kind}</strong>
            </div>
            <div className="meta-item">
              <span className="meta-label">Rentang Episode Sumber Gambar:</span>
              <span>
                <Calendar size={12} />
                {dateLabel(activeEvidence.episodeDateRange[0])} — {dateLabel(activeEvidence.episodeDateRange[1])}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Dimensi Aset:</span>
              <code>{activeEvidence.width} × {activeEvidence.height} px</code>
            </div>
          </div>

          {/* Scenario Selector: A vs B */}
          <div className="scenario-selector-wrap">
            <div className="scenario-nav-label">
              <span>Pilihan Skenario Hipotesis:</span>
            </div>
            <div className="scenario-buttons-group" role="group" aria-label="Pilihan Skenario Bukti GeoAI">
              {evidenceList.map((ev) => {
                const isSelected = ev.scenario === selectedScenario;
                return (
                  <button
                    key={ev.scenario}
                    type="button"
                    className={`scenario-btn ${isSelected ? 'active' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedScenario(ev.scenario)}
                  >
                    <span className="scenario-letter">Skenario {ev.scenario}</span>
                    <span className="scenario-subdesc">{ev.scenarioLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Visual Display */}
          <div className="evidence-image-viewport">
            <div className="image-frame">
              {failedImageUrl === activeEvidence.imageUrl ? (
                <div className="evidence-caption-box" role="alert">
                  <p>Gambar dari Neon belum dapat dimuat.</p>
                  <button type="button" className="scenario-btn" onClick={() => setFailedImageUrl(null)}>Coba muat gambar lagi</button>
                </div>
              ) : <>
              <img
                src={activeEvidence.imageUrl}
                alt={`Ilustrasi GeoAI ${activeEvidence.region} - Skenario ${activeEvidence.scenario} (${activeEvidence.title})`}
                className="evidence-main-img"
                loading="lazy"
                width={activeEvidence.width}
                height={activeEvidence.height}
                onError={() => setFailedImageUrl(activeEvidence.imageUrl)}
              />
              <button
                ref={zoomButtonRef}
                type="button"
                className="lightbox-trigger-btn"
                onClick={handleOpenLightbox}
                aria-label="Perbesar gambar bukti GeoAI"
                title="Buka pratinjau penuh (Lightbox)"
              >
                <Maximize2 size={15} />
                <span>Perbesar Gambar</span>
              </button>
              </>}
            </div>

            {/* Verification & Scenario Context Caption */}
            <div className="evidence-caption-box">
              <div className="caption-head">
                <Info size={14} className="caption-icon" />
                <strong>Interpretasi Skenario {activeEvidence.scenario} &amp; Catatan Verifikasi:</strong>
              </div>
              <p className="caption-text">
                {activeEvidence.kind === 'pembanding' ? (
                  activeEvidence.scenarioMode === 'tanpa_data' ? (
                    <>
                      <strong>Observasi Kurang Memadai:</strong> Citra penginderaan jauh pada koridor ini
                      terhalang tutupan awan atau tidak mencukupi untuk menarik kesimpulan ada/tidaknya rintangan fisik.
                      Dalam model multipilar, kondisi ini menghasilkan status bukti belum cukup (bukan konfirmasi akses lancar).
                    </>
                  ) : (
                    <>
                      <strong>Kondisi Stabil:</strong> Tidak teramati anomali fisik atau bencana alam signifikan
                      di sekitar fasilitas asal maupun alternatif layak terdekat.
                    </>
                  )
                ) : activeEvidence.scenarioMode === 'dekat_proksi' ? (
                  <>
                    <strong>Ilustrasi Hambatan Akses:</strong> Skenario A memodelkan rintangan fisik
                    (seperti genangan banjir, longsor lereng, atau kebakaran) yang beririsan langsung dengan koridor proksi jalan raya
                    ke faskes alternatif. Contoh ini menjelaskan konteks yang dapat ditelaah saat memverifikasi alasan pengalihan rujukan.
                  </>
                ) : (
                  <>
                    <strong>Skenario Hambatan di Luar Koridor:</strong> Skenario B memodelkan rintangan yang berada
                    di luar proksi jalur alternatif. Contoh ini tidak memastikan akses aktual dapat dilalui;
                    kondisi akses dan alasan klinis tetap perlu diperiksa dari data yang sesuai.
                  </>
                )}
              </p>
              <p className="caption-disclaimer">
                * Skenario A dan B adalah dua kemungkinan hipotesis demonstrasi POC; bukan dua peristiwa historis aktual yang tercatat bersamaan.
              </p>
            </div>

            {/* Relation to GeoAI Pillar */}
            <div className="evidence-pillar-linkage">
              <div className="linkage-title">
                <Sparkles size={14} color="#8064c3" />
                <span>Keterkaitan dengan Pilar GeoAI &amp; SIGARA Index</span>
              </div>
              <div className="linkage-body">
                {assignment?.isReassigned && (
                  <p>Gambar yang dipasangkan ulang adalah contoh visual; pemilihan gambar tidak menambahkan pengukuran atau skor GeoAI pada episode ini.</p>
                )}
                {mode === 'multipillar_demo' ? (
                  <p>
                    Pada <strong>Simulasi Model Multipilar (v2.0)</strong>, bukti GeoAI menyumbang bobot <strong>35%</strong> terhadap total indeks.
                    {geoaiPillar?.score != null ? (
                      <> Skor pilar GeoAI kasus ini dihitung sebesar <strong>{geoaiPillar.score.toFixed(1)} / 100</strong> ({geoaiPillar.statusLabel}).</>
                    ) : (
                      <> Status pilar: <em>{geoaiPillar?.statusLabel || 'Tersedia dalam simulasi'}</em>.</>
                    )}
                  </p>
                ) : (
                  <p>
                    Pada <strong>Data Master (v1.0)</strong>, skor indeks dihitung murni dari proksi aksesibilitas dan catatan rujukan master 2024.
                    Bukti GeoAI ini disajikan sebagai telaah transparan pendukung keputusan, dan <strong>tidak mengubah skor master</strong>.
                  </p>
                )}
              </div>
            </div>

            {/* Technical Metadata & Provenance Accordion */}
            <div className="evidence-provenance-disclosure">
              <button
                type="button"
                className="disclosure-toggle"
                onClick={() => setDetailsOpen((v) => !v)}
                aria-expanded={detailsOpen}
              >
                <span>Detail Provenance &amp; Parameter Teknis Aset v4</span>
                {detailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {detailsOpen && (
                <div className="disclosure-content">
                  <div className="metadata-grid">
                    <div>
                      <span className="grid-label">Episode yang Dibuka:</span>
                      <code>{episode.id}</code>
                    </div>
                    <div>
                      <span className="grid-label">Episode Sumber Ilustrasi:</span>
                      <code>{activeEvidence.episodeId}</code>
                    </div>
                    <div>
                      <span className="grid-label">Pemetaan Galeri:</span>
                      <span>{assignment?.isReassigned ? 'Acak tetap untuk episode tinggi' : 'Pasangan asal ilustrasi'} · {assignment?.version}</span>
                    </div>
                    <div>
                      <span className="grid-label">Nama Berkas:</span>
                      <code>{activeEvidence.fileName}</code>
                    </div>
                    <div>
                      <span className="grid-label">URL Aset:</span>
                      <code>{activeEvidence.imageUrl}</code>
                    </div>
                    <div>
                      <span className="grid-label">Penyimpanan Gambar:</span>
                      <span>Neon Object Storage · gambar diambil melalui cache aplikasi</span>
                    </div>
                    <div>
                      <span className="grid-label">Versi Aset:</span>
                      <span>{activeEvidence.assetVersion} (2026-10-28)</span>
                    </div>
                    <div>
                      <span className="grid-label">Sifat Data:</span>
                      <span>Sintetis (synthetic: true, georeferenced: false)</span>
                    </div>
                    <div>
                      <span className="grid-label">Mode Skenario:</span>
                      <code>{activeEvidence.scenarioMode}</code>
                    </div>
                    <div>
                      <span className="grid-label">Manifest Sumber:</span>
                      <code>{activeEvidence.sourceManifest}</code>
                    </div>
                  </div>
                  <p className="disclosure-note">
                    Gambar v4 merupakan visualisasi generatif berkualitas tinggi yang dirancang untuk pembacaan visual yang jelas
                    tanpa memotong legenda, judul skenario, atau footer catatan POC.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Truthful Missing / Honest State Card */
        <div className="geoai-missing-card" aria-label="Status Ketersediaan Bukti GeoAI">
          <div className="missing-icon-wrap">
            {statusInfo.status === 'skipped' ? (
              <Clock size={32} className="icon-skipped" />
            ) : (
              <Info size={32} className="icon-unknown" />
            )}
          </div>
          <div className="missing-content">
            <h4>{statusInfo.title}</h4>
            <p className="missing-desc">{statusInfo.description}</p>
            <div className="missing-truth-box">
              <span className="truth-label">Catatan Metodologi &amp; Integritas Data:</span>
              <ul>
                <li>
                  Ketiadaan aset gambar <strong>bukan berarti akses normal tanpa gangguan</strong>,
                  melainkan terbatasnya paket percontohan (8 episode / 16 gambar skenario) pada dataset POC ini.
                </li>
                <li>
                  Penempatan ilustrasi memakai paket v4 yang tersedia dan tidak mengubah hasil analisis atau skor master.
                </li>
                <li>
                  Pada mode simulasi multipilar, skor total indeks dinyatakan <strong>belum dapat dihitung</strong> jika pilar GeoAI belum memiliki data lengkap.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Accessible Lightbox Modal */}
      {lightboxOpen && activeEvidence && (
        <div
          className="geoai-lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Tampilan Penuh: ${activeEvidence.title} - Skenario ${activeEvidence.scenario}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseLightbox();
          }}
        >
          <div className="lightbox-modal">
            <div className="lightbox-bar">
              <div className="lightbox-titles">
                <strong>{activeEvidence.region} ({activeEvidence.packageId}) — Skenario {activeEvidence.scenario}</strong>
                <span>{activeEvidence.title} · {activeEvidence.scenarioLabel}</span>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="lightbox-close-btn"
                onClick={handleCloseLightbox}
                aria-label="Tutup tampilan penuh (Escape)"
                title="Tutup (Esc)"
              >
                <X size={18} />
                <span>Tutup</span>
              </button>
            </div>
            <div className="lightbox-body">
              <img
                src={activeEvidence.imageUrl}
                alt={`Perbesaran bukti GeoAI ${activeEvidence.region} Skenario ${activeEvidence.scenario}`}
                className="lightbox-full-img"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
