'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Download, ShieldAlert, Sparkles, Building2, MapPin, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { useDemoDialog } from './useDemoDialog';
import { formatSimDateTime } from '@/lib/clarification-demo';
import BrandLogo from './BrandLogo';
import type { AgentReport } from '@/lib/agent-activity';
import { REVIEW_OPTIONS } from '@/lib/officer-review';

type Props = {
  report: AgentReport;
  onClose: () => void;
};

export default function ReportViewerModal({ report, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [printing, setPrinting] = useState(false);
  const dialogRef = useDemoDialog(mounted, onClose);
  const contentRef = useRef<HTMLDivElement>(null);
  const review = report.officerReview;

  useEffect(() => { setMounted(true); }, []);

  const handlePrint = async () => {
    setPrinting(true);
    try {
      await document.fonts.ready;
      await Promise.all(Array.from(contentRef.current?.querySelectorAll('img') ?? [])
        .map(image => image.decode().catch(() => undefined)));
      if (contentRef.current) window.print();
    } finally {
      setPrinting(false);
    }
  };

  if (!mounted) return null;

  // A body-level portal lets print CSS remove the app without clipping the report.
  return createPortal(
    <div
      className="report-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="report-modal-container" ref={dialogRef}>
        {/* Modal Toolbar (hidden on print) */}
        <div className="report-toolbar no-print">
          <div className="toolbar-left">
            <FileText size={18} className="text-emerald-400" />
            <span className="toolbar-title">{report.title}</span>
            <span className="toolbar-badge">{review ? review.status === 'final' ? 'Laporan akhir' : 'Telaah lanjutan' : 'Belum disahkan petugas'}</span>
          </div>
          <div className="toolbar-actions">
            <button
              type="button"
              className="toolbar-btn print-btn"
              onClick={handlePrint}
              disabled={printing}
              title="Cetak atau Simpan PDF menggunakan dialog cetak browser"
            >
              <Printer size={15} />
              <span>{printing ? 'Menyiapkan cetak…' : 'Cetak / Simpan PDF'}</span>
            </button>
            <button
              type="button"
              className="toolbar-btn close-btn"
              onClick={onClose}
              aria-label="Tutup jendela laporan"
            >
              <X size={16} />
              <span>Tutup</span>
            </button>
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div className="report-document" ref={contentRef} id="printable-report">
          {report.clarification && <section className="doc-clarification"><h2>Ringkasan Klarifikasi — Simulasi POC</h2><p>Snapshot versi {report.revision} · {formatSimDateTime(report.createdAt)}</p><p>Kasus {report.clarification.id} · Status: {report.clarification.status}</p><p>Waktu simulasi: {formatSimDateTime(report.clarification.simulationClock)}</p><p>Pertanyaan: {report.clarification.summary?.questionAsked || 'Permintaan awal belum dijawab.'}</p><p>Jawaban dummy: {report.clarification.summary?.stakeholderResponse || 'Belum ada balasan.'}</p><p>Informasi lengkap: {report.clarification.summary?.completeItems.join('; ') || 'Belum tersedia'}</p><p>Masih kurang: {report.clarification.summary?.missingItems.join('; ') || 'Lihat penelaahan petugas'}</p><p>Rekomendasi: {report.clarification.summary?.recommendation || 'Tunggu tanggapan dan telaah petugas.'}</p><p>Catatan petugas: {report.clarification.closureNotes || 'Belum ditutup'}</p><p>Pernyataan stakeholder dummy belum diverifikasi secara independen. Indeks master tetap.</p></section>}
          {/* Header */}
          <div className="doc-header">
            <div className="doc-brand">
              <BrandLogo size={48} priority decorative />
              <div>
                <h1 id="report-modal-title" className="doc-app-name">SIGARA</h1>
                <p className="doc-app-sub">Sistem Informasi Geografis Agentik untuk Rujukan Akuntabel</p>
                <p className="doc-prov">Provinsi Nusa Tenggara Timur · Kedeputian Wilayah VIII BPJS Kesehatan</p>
              </div>
            </div>
            <div className="doc-meta">
              <div className="doc-id-badge">
                <span className="doc-meta-label">NO. BERKAS LAPORAN</span>
                <strong>{report.id}</strong>
              </div>
              <div className="doc-meta-date">
                <span className="doc-meta-label">TANGGAL PENERBITAN</span>
                <span>{report.createdAt}</span>
              </div>
            </div>
          </div>

          <div className="doc-divider" />

          {/* Banner: Simulation Notice */}
          <div className="doc-simulation-banner">
            <Sparkles size={16} />
            <div>
              <strong>{review ? review.status === 'final' ? 'LAPORAN AKHIR PENELAAHAN PETUGAS' : 'LAPORAN TELAAH LANJUTAN' : 'BAHAN PENELAAHAN — MENUNGGU KEPUTUSAN PETUGAS'}</strong>
              <p>
                {review ? `Keputusan: ${REVIEW_OPTIONS[review.decision].label}. Disahkan oleh ${review.officerName}, ${review.officerRole}. Revisi ${review.revision}.` : 'Laporan ini merangkum analisis SIGARA sebagai bahan telaah. Keputusan petugas belum ditetapkan.'}
              </p>
            </div>
          </div>

          {/* Section 1: Ringkasan Episode */}
          <div className="doc-section">
            <h2 className="doc-section-title">1. Identitas Episode &amp; Konteks Fasilitas Rujukan</h2>
            <div className="doc-grid-2">
              <div className="doc-data-card">
                <span className="data-card-label">ID Kelompok Rujukan (Episode):</span>
                <code className="data-card-code">{report.episodeId}</code>
              </div>
              <div className="doc-data-card">
                <span className="data-card-label">SIGARA Index Awal:</span>
                <strong className="data-card-value text-red">
                  {report.initialIndex != null ? report.initialIndex.toFixed(1) : '-'} / 100
                  {' '}<span className="text-sm font-normal text-muted">({({ high: 'Indikasi Tinggi', medium: 'Indikasi Sedang', low: 'Indikasi Rendah', unknown: 'Indikasi Belum Tersedia' })[report.initialCategory]})</span>
                </strong>
              </div>
            </div>

            <table className="doc-table">
              <thead>
                <tr>
                  <th>Peran Fasilitas</th>
                  <th>Nama Fasilitas Kesehatan</th>
                  <th>Jarak / Waktu Proksi</th>
                  <th>Status &amp; Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>FKTP Asal</strong></td>
                  <td>{report.fromName}</td>
                  <td>Titik Pangkal Rujukan</td>
                  <td>Fasilitas Tingkat Pertama</td>
                </tr>
                <tr>
                  <td><strong>FKRTL Tujuan Terpilih</strong></td>
                  <td>{report.toName}</td>
                  <td>{report.proxyDistanceKm.toFixed(1)} km</td>
                  <td>Fasilitas Rujukan Aktual Terpilih</td>
                </tr>
                <tr>
                  <td><strong>Alternatif Terdekat</strong></td>
                  <td>{report.altName}</td>
                  <td>Rasio Waktu: {report.timeRatio.toFixed(2)}x</td>
                  <td>Fasilitas Pembanding Layak</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Telaah Bukti Penginderaan Jauh */}
          {report.evidenceImageUrl && (
            <div className="doc-section">
              <h2 className="doc-section-title">2. Telaah Penginderaan Jauh &amp; Konteks Spasial</h2>
              <div className="doc-evidence-wrap">
                <div className="doc-evidence-img-box">
                  <img
                    src={report.evidenceImageUrl}
                    alt={`Bukti spasial episode ${report.episodeId}`}
                    className="doc-evidence-img"
                  />
                  <div className="doc-img-caption">
                    <strong>Keterangan Bukti:</strong> Ilustrasi generatif v4 dari Neon Object Storage.
                    Model visualisasi potensi rintangan fisik pada koridor transportasi rujukan (Proof of Concept).
                  </div>
                </div>
                <div className="doc-evidence-text">
                  <h4>Ringkasan Evaluasi Koridor</h4>
                  <p>{report.summary}</p>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Rekomendasi Tindak Lanjut */}
          <div className="doc-section">
            <h2 className="doc-section-title">3. Rekomendasi Tindak Lanjut Verifikator</h2>
            <ul className="doc-checklist">
              {report.recommendations.map((rec, i) => (
                <li key={i}>
                  <CheckCircle2 size={15} className="check-icon" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {review && <section className="doc-section doc-officer-review">
            <h2 className="doc-section-title">4. Keputusan &amp; Pengesahan Petugas</h2>
            <div className="doc-data-card"><span className="data-card-label">Hasil penelaahan · Revisi {review.revision}</span><strong>{REVIEW_OPTIONS[review.decision].label}</strong><span>{review.status === 'final' ? 'Keputusan akhir' : 'Menunggu tindak lanjut — belum merupakan keputusan akhir'}</span></div>
            <h3>Dasar pertimbangan</h3><p>{review.reasons.join('; ')}</p>
            <h3>Bukti / referensi pemeriksaan</h3><p>{review.evidence}</p>
            <h3>Alasan keputusan</h3><p>{review.notes}</p>
            <h3>Tindak lanjut</h3><p>{review.followup}</p>
            <p className="doc-review-approval">Disahkan oleh <strong>{review.officerName}</strong> · {review.officerRole}<br />{new Date(review.approvedAt).toLocaleString('id-ID')} · Episode {report.episodeId}</p>
          </section>}

          {/* Signatures & Footer */}
          <div className="doc-footer">
            <div className="doc-sign-box">
              <span className="sign-role">Diverifikasi Sistem:</span>
              <div className="sign-seal">SIGARA AGENT VERIFIED</div>
              <span className="sign-name">Modul Otomasi Evaluasi Spasial NTT</span>
            </div>
            <div className="doc-sign-box">
              <span className="sign-role">Petugas Penelaah Lapangan:</span>
              <div className="sign-line" />
              <span className="sign-name">{review ? <><strong>{review.officerName}</strong><br />{review.officerRole}</> : '( Tanda tangan & Nama Terang Verifikator )'}</span>
            </div>
          </div>

          <div className="doc-legal">
            Dokumen ini dihasilkan secara otomatis oleh SIGARA (Sistem Informasi Geospasial Akuntabilitas Rujukan Antar-Fasilitas) BPJS Kesehatan Healthkathon 2026.
            Seluruh data merujuk pada catatan rujukan NTT 2024 dan simulasi model spasial multipilar.
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
