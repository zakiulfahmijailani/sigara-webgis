'use client';
import React from 'react';
import type { GeoAIImage } from '@/lib/showcase';
import type { IndexPillar } from '@/lib/sigara-index-types';
import { Sparkles, Layers, Info, ExternalLink, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';

type Props = {
  image: GeoAIImage | null;
  geoaiPillar?: IndexPillar | null;
  onScrollToSankey?: () => void;
};

export default function GeoAIMetricBreakdown({ image, geoaiPillar, onScrollToSankey }: Props) {
  if (!image) {
    return (
      <div className="geoai-metric-unavail" aria-label="Status Data GeoAI">
        <Info size={20} className="unavail-icon" />
        <div>
          <h4>Konteks Spasial GeoAI Belum Tersedia untuk Episode Ini</h4>
          <p>
            Paket ilustrasi penginderaan jauh saat ini memuat 16 aset raster untuk 8 episode percontohan di NTT. Episode ini tidak memiliki dataset raster simulasi bencana. Status pada pilar GeoAI adalah <em>Belum tersedia</em> (bukan nilai nol).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="geoai-metric-breakdown" aria-label="Rincian Metrik Numerik GeoAI">
      <div className="metric-header">
        <div className="badge-line">
          <span className="pill-geoai">
            <Sparkles size={12} />
            PILAR GEOAI &amp; KONDISI LINGKUNGAN
          </span>
          <span className="pill-pkg">{image.package} · {image.region}</span>
        </div>
        <h4>Pengukuran Spektral &amp; Paparan Akses Koridor</h4>
        <p className="subtitle">
          Evaluasi ilmiah kondisi medan fisik dan satelit multispektral terhadap kelayakan jalur rujukan.
        </p>
      </div>

      <div className="layers-grid">
        {/* Layer 1: Pengukuran Spektral */}
        <div className="layer-card">
          <div className="layer-title">
            <span className="num">1</span>
            <strong>Pengukuran Spektral</strong>
          </div>
          <div className="layer-body">
            <div className="metric-row">
              <span className="label">Indeks Spektral:</span>
              <strong className="val">{image.index}</strong>
            </div>
            <div className="metric-row">
              <span className="label">Formula:</span>
              <code className="code-formula">{image.formula}</code>
            </div>
            <div className="metric-row">
              <span className="label">Aturan Deteksi:</span>
              <span className="rule-text">{image.rule}</span>
            </div>
            <div className="metric-row">
              <span className="label">Piksel Kandidat:</span>
              <strong>{image.candidatePixels.toLocaleString('id-ID')} piksel (grid nominal {image.nominalGridM}m)</strong>
            </div>
            <div className="metric-row">
              <span className="label">Tutupan Daratan Valid:</span>
              <strong>{(image.validFractionLand * 100).toFixed(1)}%</strong>
            </div>
          </div>
        </div>

        {/* Layer 2: Paparan Koridor Akses */}
        <div className="layer-card">
          <div className="layer-title">
            <span className="num">2</span>
            <strong>Paparan Koridor Akses</strong>
          </div>
          <div className="layer-body">
            <div className="metric-row">
              <span className="label">Perpotongan Proksi Jalan:</span>
              <strong className={image.nearProxyIntersection ? 'text-warn' : 'text-ok'}>
                {image.nearProxyIntersection ? 'Berpotongan dengan koridor akses' : 'Tidak memotong koridor akses'}
              </strong>
            </div>
            <div className="metric-row">
              <span className="label">Status Deteksi Kejadian:</span>
              <span>{image.noRealDetection ? 'Bukan deteksi aktual (simulasi kontrol)' : 'Deteksi kandidat kejadian'}</span>
            </div>
            <div className="metric-row">
              <span className="label">Celah Kualitas Citra:</span>
              <span>{image.qualityGapNearProxy ? 'Ada gap kualitas di sekitar proksi' : 'Kualitas spektral memadai'}</span>
            </div>
          </div>
        </div>

        {/* Layer 3: Interpretasi Penelaahan */}
        <div className="layer-card">
          <div className="layer-title">
            <span className="num">3</span>
            <strong>Interpretasi Penelaahan</strong>
          </div>
          <div className="layer-body">
            {image.nearProxyIntersection && !image.noRealDetection ? (
              <p className="interp-text alert-justified">
                Genangan/longsor terdeteksi memotong koridor alternatif terdekat. Kondisi ini memberikan <strong>pembenaran lingkungan</strong> mengapa rujukan dialihkan ke faskes tujuan yang lebih jauh.
              </p>
            ) : (
              <p className="interp-text alert-unjustified">
                Koridor fasilitas alternatif terpantau bebas hambatan fisik spektral. Pengalihan rujukan ke tujuan yang lebih jauh <strong>tidak dijelaskan oleh rintangan lingkungan</strong>.
              </p>
            )}
            <p className="interp-sub">
              Arah penilaian: Adanya bencana yang menutup alternatif mengurangi kecurigaan rujukan; bukan menambah poin fraud.
            </p>
          </div>
        </div>

        {/* Layer 4: Kontribusi ke Indeks */}
        <div className="layer-card">
          <div className="layer-title">
            <span className="num">4</span>
            <strong>Kontribusi ke Indeks</strong>
          </div>
          <div className="layer-body">
            <div className="metric-row">
              <span className="label">Skor Pilar GeoAI:</span>
              <strong>{geoaiPillar?.score != null ? `${geoaiPillar.score.toFixed(1)} / 100` : 'Belum dihitung'}</strong>
            </div>
            <div className="metric-row">
              <span className="label">Bobot Model:</span>
              <strong>{geoaiPillar?.weight ? `${Math.round(geoaiPillar.weight * 100)}%` : '35% (Simulasi v2)'}</strong>
            </div>
            <div className="metric-row">
              <span className="label">Kontribusi Poin:</span>
              <strong style={{ color: '#8064c3', fontSize: '13px' }}>
                {geoaiPillar?.contributionPoints != null ? `+${geoaiPillar.contributionPoints.toFixed(1)} pt` : '—'}
              </strong>
            </div>

            {onScrollToSankey && (
              <button
                type="button"
                className="scroll-sankey-btn"
                onClick={onScrollToSankey}
              >
                <span>Lihat kontribusi ke indeks &amp; Sankey</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
