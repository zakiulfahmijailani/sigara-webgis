'use client';
import { useState } from 'react';
import Image from 'next/image';
import {
  ExternalLink,
  Layers,
  Sparkles,
  Maximize2,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileText,
  Sliders,
  X,
  Compass,
} from 'lucide-react';
import type { Episode, GeoAIImage, GeoAIManifest } from '@/lib/showcase';

type Props = {
  episode: Episode | null;
  geoaiManifest: GeoAIManifest;
  activeImage: GeoAIImage | null;
  setActiveImage: (img: GeoAIImage | null) => void;
  showOverlay: boolean;
  setShowOverlay: (v: boolean) => void;
  overlayOpacity: number;
  setOverlayOpacity: (v: number) => void;
  showSatelliteBackdrop: boolean;
  setShowSatelliteBackdrop: (v: boolean) => void;
  onSelectEpisode: (epId: string) => void;
};

export default function GeoAIViewer({
  episode,
  geoaiManifest,
  activeImage,
  setActiveImage,
  showOverlay,
  setShowOverlay,
  overlayOpacity,
  setOverlayOpacity,
  showSatelliteBackdrop,
  setShowSatelliteBackdrop,
  onSelectEpisode,
}: Props) {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [showMethods, setShowMethods] = useState(false);

  // Filter images for this episode (strictly String(episode.id) === String(image.episode))
  const episodeImages = episode
    ? geoaiManifest.images.filter((img) => String(img.episode) === String(episode.id))
    : [];

  const hasEvidence = episodeImages.length > 0;

  // The 8 GeoAI Demonstration Episodes for quick access
  const demoEpisodes = [
    { id: '290411124Y000018', region: 'Sikka', kind: 'Banjir (MNDWI)', package: 'NTT-01' },
    { id: '177250424P000119', region: 'Kupang', kind: 'Banjir (MNDWI)', package: 'NTT-03' },
    { id: '496481024Y000339', region: 'Manggarai', kind: 'Longsor (dNDVI)', package: 'NTT-04' },
    { id: '192850524Y000219', region: 'Manggarai Timur', kind: 'Longsor (dNDVI)', package: 'NTT-06' },
    { id: '23120624P000056', region: 'TTS', kind: 'Kebakaran (dNBR)', package: 'NTT-02' },
    { id: '42640724P000004', region: 'Belu', kind: 'Kebakaran (dNBR)', package: 'NTT-07' },
    { id: '24181024Y000034', region: 'Ende', kind: 'Kontrol / Stabil', package: 'NTT-05' },
    { id: '23670224P000184', region: 'Flores Timur', kind: 'Kontrol / Stabil', package: 'NTT-08' },
  ];

  return (
    <div className="geoai-viewer-container" style={{ padding: '4px 0' }}>
      {/* 8-Episode Quick Access Bar */}
      <details style={{ marginBottom: '14px', background: '#f5f9f6', padding: '10px 12px', borderRadius: '8px', border: '1px solid #dbe6de' }}>
        <summary style={{ fontSize: '13px', cursor: 'pointer', color: '#2d6852', padding: '4px 0' }}>Jelajahi episode contoh lainnya</summary>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: '#2d6852', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={13} /> 8 Episode Contoh Bukti GeoAI
          </span>
          <span style={{ fontSize: '9px', color: '#688274' }}>Pilih untuk eksplorasi</span>
        </div>
        <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '3px' }}>
          {demoEpisodes.map((demo) => {
            const isCurrent = episode?.id === demo.id;
            return (
              <button
                key={demo.id}
                type="button"
                onClick={() => onSelectEpisode(demo.id)}
                style={{
                  fontSize: '9px',
                  padding: '4px 8px',
                  borderRadius: '5px',
                  border: isCurrent ? '1.5px solid #23715d' : '1px solid #c8d8cf',
                  background: isCurrent ? '#e3f3ec' : '#ffffff',
                  color: isCurrent ? '#164e3f' : '#456355',
                  fontWeight: isCurrent ? 600 : 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {demo.region} ({demo.package})
              </button>
            );
          })}
        </div>
      </details>

      {!hasEvidence ? (
        /* Truthful No-Illustration State */
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            background: '#fafbf9',
            border: '1px dashed #dbe3db',
            borderRadius: '9px',
            color: '#718579',
          }}
        >
          <Info size={28} style={{ margin: '0 auto 10px', color: '#95a89e' }} />
          <strong style={{ display: 'block', fontSize: '12px', color: '#3d594b', marginBottom: '5px' }}>
            Belum ada ilustrasi GeoAI untuk episode ini
          </strong>
          <p style={{ fontSize: '10px', lineHeight: 1.7, maxWidth: '340px', margin: '0 auto' }}>
            Paket ilustrasi GeoAI v2 mencakup 16 ilustrasi untuk 8 episode rujukan prioritas di NTT. Episode {episode?.id || ''} tidak memiliki dataset raster simulasi bencana.
          </p>
          <div style={{ marginTop: '14px' }}>
            <span style={{ fontSize: '9px', color: '#7a8e83' }}>
              Buka &quot;Jelajahi episode contoh lainnya&quot; untuk melihat skenario GeoAI yang tersedia.
            </span>
          </div>
        </div>
      ) : (
        /* Active GeoAI Evidence Content */
        <div>
          {/* Header & Truthful Notice */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div>
              <span
                style={{
                  fontSize: '8px',
                  letterSpacing: '1px',
                  fontWeight: 700,
                  color: '#0284c7',
                  background: '#e0f2fe',
                  padding: '3px 6px',
                  borderRadius: '4px',
                }}
              >
                SIMULASI POC · OVERLAY SINTETIS
              </span>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#1e3a2f', marginTop: '4px' }}>
                {activeImage?.title || 'Analisis Penginderaan Jauh'} ({activeImage?.package} · {activeImage?.region})
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowMethods(!showMethods)}
              style={{
                fontSize: '9px',
                color: '#286a54',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 7px',
                borderRadius: '5px',
                border: '1px solid #cfe0d7',
                background: '#f4f8f5',
              }}
            >
              <FileText size={12} /> {showMethods ? 'Tutup Metode' : 'Metode & Bukti'}
            </button>
          </div>

          {/* Scenario Selector: A vs B */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            {episodeImages.map((img) => {
              const isSelected = activeImage?.number === img.number;
              const isNearProxy = img.nearProxyIntersection;
              return (
                <button
                  key={img.number}
                  type="button"
                  onClick={() => setActiveImage(img)}
                  style={{
                    padding: '8px 10px',
                    textAlign: 'left',
                    borderRadius: '7px',
                    border: isSelected ? '2px solid #23715d' : '1px solid #dbe3db',
                    background: isSelected ? '#edf7f2' : '#ffffff',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 2px 6px rgba(35,113,93,0.1)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '11px', color: isSelected ? '#1b5646' : '#334e42' }}>
                      Skenario {img.scenario}
                    </strong>
                    <span
                      style={{
                        fontSize: '8px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: isNearProxy ? '#fee2e2' : '#f0fdf4',
                        color: isNearProxy ? '#991b1b' : '#166534',
                        fontWeight: 600,
                      }}
                    >
                      {isNearProxy ? 'Potong Proksi' : 'Di Luar Proksi'}
                    </span>
                  </div>
                  <p style={{ fontSize: '9px', color: '#687e72', margin: '4px 0 0', lineHeight: 1.4 }}>
                    {img.mode === 'dekat_proksi'
                      ? 'Kandidat bencana memotong koridor akses'
                      : img.mode === 'di_luar_proksi'
                      ? 'Bencana terdeteksi di luar koridor'
                      : img.mode === 'stabil'
                      ? 'Kondisi stabil tanpa perubahan berarti'
                      : 'Data tidak lengkap / tutupan awan'}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Thumbnail / Fullscreen Preview Card */}
          {activeImage && (
            <div
              style={{
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #d4ded7',
                background: '#1a2923',
                marginBottom: '12px',
              }}
            >
              <div style={{ position: 'relative', width: '100%', height: '175px' }}>
                <Image
                  src={activeImage.thumbnail}
                  alt={`Ilustrasi ${activeImage.title}`}
                  fill
                  style={{ objectFit: 'contain' }}
                  sizes="(max-width: 768px) 100vw, 350px"
                />
              </div>

              {/* Overlay controls on image */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '6px',
                  right: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(15, 30, 24, 0.85)',
                  backdropFilter: 'blur(4px)',
                  padding: '5px 8px',
                  borderRadius: '5px',
                  color: '#e5ece7',
                  fontSize: '9px',
                }}
              >
                <span>{activeImage.index} · {activeImage.nominalGridM}m grid</span>
                <button
                  type="button"
                  onClick={() => setFullscreenImage(activeImage.image)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#6ee7b7',
                    cursor: 'pointer',
                    fontSize: '9px',
                    fontWeight: 600,
                  }}
                >
                  <Maximize2 size={11} /> Perbesar resolusi penuh
                </button>
              </div>
            </div>
          )}

          {/* Interactive Map Overlay Controls */}
          {activeImage && (
            <div
              style={{
                background: '#f9faf7',
                border: '1px solid #e1e7de',
                borderRadius: '7px',
                padding: '9px 12px',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#2b5c49', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Layers size={13} /> Overlay Peta Interaktif (MapLibre)
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9px', cursor: 'pointer', color: '#3f5d4f' }}>
                  <input
                    type="checkbox"
                    checked={showOverlay}
                    onChange={(e) => setShowOverlay(e.target.checked)}
                  />
                  <span>Tampilkan di Peta</span>
                </label>
              </div>

              {showOverlay && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'center', fontSize: '9px', color: '#566e61' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '3px' }}>
                      Opasitas Raster: {Math.round(overlayOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                      style={{ width: '100%', height: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', marginTop: '8px' }}>
                      <input
                        type="checkbox"
                        checked={showSatelliteBackdrop}
                        onChange={(e) => setShowSatelliteBackdrop(e.target.checked)}
                      />
                      <span>Latar Sentinel-2 2024</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scientific Variables & Index Rules */}
          {activeImage && (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e3e8e1',
                borderRadius: '7px',
                padding: '10px 12px',
                marginBottom: '10px',
                fontSize: '10px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                <div>
                  <span style={{ color: '#829488', fontSize: '9px', display: 'block' }}>Indeks Spektral</span>
                  <strong style={{ color: '#2b4d3d', fontSize: '11px' }}>{activeImage.index}</strong>
                </div>
                <div>
                  <span style={{ color: '#829488', fontSize: '9px', display: 'block' }}>Formula Matematis</span>
                  <code style={{ color: '#0369a1', fontSize: '10px' }}>{activeImage.formula}</code>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <span style={{ color: '#829488', fontSize: '9px', display: 'block' }}>Aturan Penyaringan</span>
                  <span style={{ color: '#476355' }}>{activeImage.rule}</span>
                </div>
                <div>
                  <span style={{ color: '#829488', fontSize: '9px', display: 'block' }}>Piksel Kandidat</span>
                  <strong style={{ color: '#2b4d3d' }}>
                    {activeImage.candidatePixels.toLocaleString('id-ID')} piksel (20m)
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#829488', fontSize: '9px', display: 'block' }}>Rasio Tutupan Daratan</span>
                  <strong style={{ color: '#2b4d3d' }}>
                    {(activeImage.validFractionLand * 100).toFixed(1)}%
                  </strong>
                </div>
              </div>

              {/* Reference paper */}
              <div style={{ marginTop: '9px', paddingTop: '8px', borderTop: '1px solid #edf1eb', fontSize: '9px', color: '#6a8073' }}>
                <span>Referensi ilmiah: </span>
                <a
                  href={activeImage.paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0284c7', textDecoration: 'underline' }}
                >
                  {activeImage.paper.short} <ExternalLink size={9} style={{ display: 'inline' }} />
                </a>
              </div>
            </div>
          )}

          {/* Expandable Methods & Provenance Details */}
          {showMethods && (
            <div
              style={{
                background: '#f4f7f4',
                border: '1px solid #d2dfd7',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '10px',
                lineHeight: 1.7,
                color: '#3d5749',
                marginBottom: '10px',
              }}
            >
              <h5 style={{ fontSize: '11px', fontWeight: 600, color: '#1a4031', margin: '0 0 6px' }}>
                Transparansi Metode &amp; Batasan Data POC
              </h5>
              <ul style={{ paddingLeft: '16px', margin: '0 0 8px' }}>
                <li>
                  <strong>Latar Mosaik:</strong> EOX Sentinel-2 cloudless annual RGB mosaic 2024 (CC BY-NC-SA 4.0).
                </li>
                <li>
                  <strong>Raster Analitis:</strong> Dihasilkan secara sintetis untuk demonstrasi POC. Bukan hasil deteksi satelit operasional real-time.
                </li>
                <li>
                  <strong>Status Skenario:</strong> Skenario A dan B merupakan dua kemungkinan hipotesis alternatif, bukan observasi historis ganda.
                </li>
                <li>
                  <strong>Kategori Rujukan:</strong> Label prioritas pemeriksaan rujukan pada master tetap dipertahankan dan tidak otomatis diubah oleh keberadaan bukti satelit sintetis.
                </li>
              </ul>
              <div style={{ fontSize: '9px', color: '#738b7d' }}>
                Sentinel-2 cloudless — https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024).
              </div>
            </div>
          )}

          <p style={{ fontSize: '9px', color: '#889c8f', textAlign: 'center', margin: '8px 0 0' }}>
            Overlay analitis sintetis · Titik dan koridor OD tetap berada di atas citra.
          </p>
        </div>
      )}

      {/* Fullscreen Modal Viewer */}
      {fullscreenImage && (
        <div
          role="dialog"
          aria-label="Tampilan penuh ilustrasi GeoAI"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(10, 20, 16, 0.92)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setFullscreenImage(null)}
        >
          <div
            style={{
              position: 'relative',
              width: 'min(1280px, 95vw)',
              height: 'min(860px, 85vh)',
              background: '#162820',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '46px',
                background: 'rgba(15, 30, 24, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                color: '#fff',
                zIndex: 2,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                <strong>{activeImage?.title}</strong>
                <span style={{ color: '#90a89a' }}>
                  {activeImage?.package} · Skenario {activeImage?.scenario} · 1920 × 1340 px
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFullscreenImage(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '5px',
                }}
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ position: 'relative', width: '100%', height: 'calc(100% - 46px)', marginTop: '46px' }}>
              <Image
                src={fullscreenImage}
                alt="Ilustrasi penuh GeoAI"
                fill
                style={{ objectFit: 'contain' }}
                sizes="100vw"
                priority
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
