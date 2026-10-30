'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Maximize2,
  X,
  Info,
  Calendar,
  MapPin,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Navigation,
  ArrowRight,
  Compass,
  FileText,
} from 'lucide-react';
import type { Episode } from '@/lib/showcase';
import type { IndexPillar } from '@/lib/sigara-index-types';
import {
  getEpisodeGeoAIStatus,
  getPrimaryEvidenceForEpisode,
  type GeoAIStatusInfo,
} from '@/lib/geoai-evidence-v4';
import {
  getEpisodeEligibility,
  loadAgentState,
  createEpisodeReport,
  type AgentReport,
} from '@/lib/agent-activity';
import ReportViewerModal from '../ReportViewerModal';
import { dateLabel, formatKm, formatMinutes } from '@/lib/showcase';

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
  const [activeView, setActiveView] = useState<'remote_sensing' | 'spatial_analysis'>('remote_sensing');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<AgentReport | null>(null);
  const [agentState, setAgentState] = useState(loadAgentState);
  const zoomButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Reset state on episode change
  useEffect(() => {
    setActiveView('remote_sensing');
    setLightboxOpen(false);
    setFailedImageUrl(null);
    setActiveReport(null);
    setAgentState(loadAgentState());
  }, [episode.id]);

  // Pair existing illustration with high-risk episodes (deterministic single image)
  const assignment = getPrimaryEvidenceForEpisode(episode);
  const primaryEvidence = assignment?.primaryEvidence || null;
  const hasEvidence = Boolean(primaryEvidence);

  // Truthful status computation
  const statusInfo: GeoAIStatusInfo = getEpisodeGeoAIStatus(episode, primaryEvidence);

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

  // Check eligibility based on initial index/category (medium/low skipped)
  const eligibility = getEpisodeEligibility(episode);
  if (eligibility.eligibility === 'skipped' || episode.cat !== 'TINGGI_SIM') return null;

  const reviewedRecord = agentState.reviewedEpisodes[episode.id] || null;
  const isReviewed = Boolean(reviewedRecord);

  return (
    <section
      id="geoai-evidence"
      className="inline-geoai-section"
      aria-label="Analisis GeoAI Episode Ini"
    >
      <div className="geoai-section-header">
        <div className="section-title-wrap">
          <div className="kicker-row">
            <span className="geoai-kicker">ANALISIS GEOAI</span>
            <span className="geoai-sim-badge">
              <Sparkles size={11} />
              ILUSTRASI POC
            </span>
            <span className={`geoai-status-pill ${isReviewed ? 'completed' : 'waiting'}`}>
              {isReviewed ? 'Selesai Ditelaah (Simulasi)' : 'Menunggu Pemeriksaan'}
            </span>
            <span className={`geoai-status-pill ${statusInfo.status}`}>
              {statusInfo.badgeLabel}
            </span>
          </div>
          <h3 className="section-title">Analisis GeoAI Episode Ini</h3>
          <p className="section-subtitle">
            Konteks spasial dan telaah penginderaan jauh pendukung verifikasi akses rujukan pada episode {episode.id}.
            {' '}<span className="eligibility-tag">{eligibility.eligibilityReason}</span>
          </p>
          {assignment?.isReassigned && (
            <p className="section-subtitle">
              Ilustrasi dipilih secara acak tetap sebagai demonstrasi untuk episode {episode.id}.
              {' '}ID, wilayah, dan tanggal di dalam poster mengikuti data sumber {assignment.sourceEpisodeId};
              {' '}gambar ini adalah visualisasi representatif, bukan observasi langsung episode yang dibuka.
            </p>
          )}
        </div>
        <div className="header-report-action">
          <button
            type="button"
            className="btn-create-report"
            onClick={() => {
              const rpt = agentState.reports[episode.id] || createEpisodeReport(episode, reviewedRecord);
              setActiveReport(rpt);
            }}
            title="Buka atau cetak berkas laporan telaah episode"
          >
            <FileText size={14} />
            <span>{agentState.reports[episode.id] ? 'Buka Laporan Episode' : 'Buat Laporan Episode'}</span>
          </button>
        </div>
      </div>

      {/* Two-tab local view selector: Penginderaan Jauh & GeoAI vs Analisis Spasial */}
      <div className="geoai-view-tabs" role="tablist" aria-label="Pilihan Jenis Tampilan Analisis">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'remote_sensing'}
          className={`view-tab-btn ${activeView === 'remote_sensing' ? 'active' : ''}`}
          onClick={() => setActiveView('remote_sensing')}
        >
          <Layers size={15} />
          <span>Penginderaan Jauh &amp; GeoAI</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'spatial_analysis'}
          className={`view-tab-btn ${activeView === 'spatial_analysis' ? 'active' : ''}`}
          onClick={() => setActiveView('spatial_analysis')}
        >
          <Navigation size={15} />
          <span>Analisis Spasial</span>
        </button>
      </div>

      {/* VIEW A: Penginderaan Jauh & GeoAI (Default) */}
      {activeView === 'remote_sensing' && (
        <>
          {hasEvidence && primaryEvidence ? (
            <div className="geoai-evidence-card">
              {/* Top metadata strip */}
              <div className="evidence-meta-strip">
                <div className="meta-item">
                  <span className="meta-label">Wilayah Ilustrasi:</span>
                  <strong>
                    <MapPin size={12} />
                    {primaryEvidence.region} ({primaryEvidence.packageId})
                  </strong>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Jenis Analisis:</span>
                  <strong>{kindLabels[primaryEvidence.kind] || primaryEvidence.kind}</strong>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Rentang Episode Sumber:</span>
                  <span>
                    <Calendar size={12} />
                    {dateLabel(primaryEvidence.episodeDateRange[0])} — {dateLabel(primaryEvidence.episodeDateRange[1])}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Dimensi Aset:</span>
                  <code>{primaryEvidence.width} × {primaryEvidence.height} px</code>
                </div>
              </div>

              {/* Main Visual Display */}
              <div className="evidence-image-viewport">
                <div className="image-frame">
                  {failedImageUrl === primaryEvidence.imageUrl ? (
                    <div className="evidence-caption-box" role="alert">
                      <p>Gambar dari Neon belum dapat dimuat.</p>
                      <button
                        type="button"
                        className="retry-btn"
                        onClick={() => setFailedImageUrl(null)}
                      >
                        Coba muat gambar lagi
                      </button>
                    </div>
                  ) : (
                    <>
                      <img
                        src={primaryEvidence.imageUrl}
                        alt={`Ilustrasi GeoAI ${primaryEvidence.region} - ${primaryEvidence.title}`}
                        className="evidence-main-img"
                        loading="lazy"
                        width={primaryEvidence.width}
                        height={primaryEvidence.height}
                        onError={() => setFailedImageUrl(primaryEvidence.imageUrl)}
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
                    </>
                  )}
                </div>

                {/* Verification & Analysis Interpretation Caption */}
                <div className="evidence-caption-box">
                  <div className="caption-head">
                    <Info size={14} className="caption-icon" />
                    <strong>Interpretasi Analisis &amp; Catatan Verifikasi:</strong>
                  </div>
                  <p className="caption-text">
                    {primaryEvidence.kind === 'pembanding' ? (
                      primaryEvidence.scenarioMode === 'tanpa_data' ? (
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
                    ) : (
                      <>
                        <strong>Ilustrasi Rintangan Koridor:</strong> Visualisasi pemodelan potensi rintangan fisik
                        (seperti genangan banjir, longsor lereng, atau kebakaran) pada jalur proksi transportasi menuju fasilitas alternatif.
                        Contoh ini menjelaskan konteks spasial yang dapat ditelaah dalam verifikasi pengalihan rujukan.
                      </>
                    )}
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
                      <p>
                        Gambar yang dipasangkan ulang adalah contoh visual demonstrasi; pemilihan gambar tidak menambahkan pengukuran atau skor GeoAI pada episode ini.
                      </p>
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
                          <code>{primaryEvidence.episodeId}</code>
                        </div>
                        <div>
                          <span className="grid-label">Pemetaan Galeri:</span>
                          <span>{assignment?.isReassigned ? 'Acak tetap untuk episode tinggi' : 'Pasangan asal ilustrasi'} · {assignment?.version}</span>
                        </div>
                        <div>
                          <span className="grid-label">Nama Berkas:</span>
                          <code>{primaryEvidence.fileName}</code>
                        </div>
                        <div>
                          <span className="grid-label">URL Aset:</span>
                          <code>{primaryEvidence.imageUrl}</code>
                        </div>
                        <div>
                          <span className="grid-label">Penyimpanan Gambar:</span>
                          <span>Neon Object Storage · gambar diambil melalui route cache aplikasi</span>
                        </div>
                        <div>
                          <span className="grid-label">Versi Aset:</span>
                          <span>{primaryEvidence.assetVersion} (2026-10-28)</span>
                        </div>
                        <div>
                          <span className="grid-label">Sifat Data:</span>
                          <span>Sintetis (synthetic: true, georeferenced: false)</span>
                        </div>
                        <div>
                          <span className="grid-label">Mode Analisis:</span>
                          <code>{primaryEvidence.scenarioMode}</code>
                        </div>
                        <div>
                          <span className="grid-label">Manifest Sumber:</span>
                          <code>{primaryEvidence.sourceManifest}</code>
                        </div>
                      </div>
                      <p className="disclosure-note">
                        Gambar v4 merupakan visualisasi ilustratif berkualitas tinggi yang dirancang untuk pembacaan visual yang jelas
                        tanpa memotong legenda atau footer catatan POC.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
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
                      melainkan terbatasnya paket percontohan (8 episode) pada dataset POC ini.
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
        </>
      )}

      {/* VIEW B: Analisis Spasial */}
      {activeView === 'spatial_analysis' && (
        <div className="geoai-spatial-panel">
          <div className="spatial-pane-header">
            <div>
              <h4 className="spatial-pane-title">Konteks Spasial Rujukan &amp; Proksi Aksesibilitas</h4>
              <p className="spatial-pane-subtitle">
                Perbandingan keterjangkauan spasial antara faskes asal, tujuan terpilih, dan alternatif terdekat pada episode {episode.id}.
              </p>
            </div>
          </div>

          {/* OD Corridor Summary */}
          <div className="spatial-od-corridor">
            <div className="corridor-point origin-point">
              <span className="point-badge origin-badge">FKTP Asal</span>
              <strong className="point-name">{episode.fromName}</strong>
              {episode.fromLat != null && episode.fromLon != null && (
                <span className="point-coords">{episode.fromLat.toFixed(4)}, {episode.fromLon.toFixed(4)}</span>
              )}
            </div>
            <div className="corridor-arrow">
              <ArrowRight size={20} />
              <span className="corridor-label">Rujukan Aktual</span>
            </div>
            <div className="corridor-point dest-point">
              <span className="point-badge dest-badge">FKRTL Tujuan Terpilih</span>
              <strong className="point-name">{episode.toName}</strong>
              {episode.toLat != null && episode.toLon != null && (
                <span className="point-coords">{episode.toLat.toFixed(4)}, {episode.toLon.toFixed(4)}</span>
              )}
            </div>
            {episode.altId && (
              <>
                <div className="corridor-divider" />
                <div className="corridor-point alt-point">
                  <span className="point-badge alt-badge">Alternatif Terdekat</span>
                  <strong className="point-name">
                    {episode.altOutside ? 'Faskes Luar NTT' : (episode.altName || episode.altId)}
                  </strong>
                  {episode.altLat != null && episode.altLon != null && (
                    <span className="point-coords">{episode.altLat.toFixed(4)}, {episode.altLon.toFixed(4)}</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Metric Comparison Cards */}
          <div className="spatial-metric-grid">
            <div className="spatial-card">
              <span className="card-kicker">JARAK PROKSI TUJUAN</span>
              <div className="card-value">{formatKm(episode.distM)}</div>
              <div className="card-subtext">
                Alternatif terdekat: <strong>{episode.altOutside ? 'Luar NTT' : (episode.altId ? 'Tersedia faskes pembanding' : '-')}</strong>
              </div>
              <div className="card-tag neutral">
                Metode: {episode.distMethod || 'Proksi geodetik'}
              </div>
            </div>

            <div className="spatial-card">
              <span className="card-kicker">ESTIMASI WAKTU TEMPUH PROKSI</span>
              <div className="card-value">{formatMinutes(episode.timeMin)}</div>
              <div className="card-subtext">
                Alternatif: <strong>{episode.altOutside ? 'Luar NTT' : formatMinutes(episode.altTimeMin)}</strong>
              </div>
              <div className={`card-tag ${episode.diffMin && episode.diffMin > 0 ? 'warning' : 'neutral'}`}>
                {episode.diffMin != null ? `Selisih: +${formatMinutes(episode.diffMin)}` : ''}
                {episode.timeRatio != null ? ` (${episode.timeRatio.toFixed(2)}x)` : ''}
              </div>
            </div>

            <div className="spatial-card">
              <span className="card-kicker">INDIKATOR EFISIENSI RUJUKAN</span>
              <div className="card-value card-status-text">
                {episode.altId
                  ? (episode.altOutside ? 'Alternatif Luar NTT' : 'Alternatif Lebih Dekat')
                  : 'Tujuan Merupakan Terdekat'}
              </div>
              <div className="card-subtext">
                {episode.altId
                  ? (episode.altOutside
                      ? 'Fasilitas alternatif teridentifikasi berada di luar wilayah administratif NTT.'
                      : 'Terdapat fasilitas rujukan lain dengan estimasi waktu lebih singkat dari FKTP asal.')
                  : 'Fasilitas yang dipilih merupakan rujukan paling efisien secara proksi geodetik.'}
              </div>
            </div>
          </div>

          {/* Spatial Disclaimer & Map Navigation Helper */}
          <div className="spatial-map-helper">
            <div className="helper-left">
              <Compass size={18} className="helper-icon" />
              <div>
                <strong>Metodologi Proksi Spasial:</strong>
                <p>
                  Garis OD dan metrik jarak/waktu dihitung sebagai proksi keterjangkauan spasial antar titik fasilitas rujukan NTT 2024,
                  bukan rute GPS navigasi jalan raya aktual.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="scroll-map-btn"
              onClick={() => {
                document.querySelector('.inv-map-wrap')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Compass size={14} />
              <span>Lihat Peta Interaktif di Panel Atas</span>
            </button>
          </div>
        </div>
      )}

      {/* Accessible Lightbox Modal */}
      {lightboxOpen && primaryEvidence && (
        <div
          className="geoai-lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Tampilan Penuh: ${primaryEvidence.title}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseLightbox();
          }}
        >
          <div className="lightbox-modal">
            <div className="lightbox-bar">
              <div className="lightbox-titles">
                <strong>{primaryEvidence.region} ({primaryEvidence.packageId})</strong>
                <span>{primaryEvidence.title} · {kindLabels[primaryEvidence.kind] || primaryEvidence.kind}</span>
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
                src={primaryEvidence.imageUrl}
                alt={`Perbesaran bukti GeoAI ${primaryEvidence.region} - ${primaryEvidence.title}`}
                className="lightbox-full-img"
              />
            </div>
          </div>
        </div>
      )}
      {/* Printable Report Modal */}
      {activeReport && (
        <ReportViewerModal
          report={activeReport}
          onClose={() => setActiveReport(null)}
        />
      )}
    </section>
  );
}
