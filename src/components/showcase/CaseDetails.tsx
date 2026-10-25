'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  FileText,
  GitBranch,
  Info,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Calendar,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  categoryFromMaster,
  colors,
  dateLabel,
  formatKm,
  formatMinutes,
  formatNumber,
  getReasonLabel,
  labels,
  type Episode,
  type ShowcaseData,
  type Visit,
} from '@/lib/showcase';
import BrandLogo from './BrandLogo';

export default function CaseDetails({
  data,
  referral: ep,
  onSelectCase,
  onClose,
}: {
  data: ShowcaseData;
  referral: Episode | null;
  onSelectCase: (id: string) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  // Fetch visit timeline for the selected episode
  useEffect(() => {
    if (!ep) return;
    setLoadingVisits(true);
    fetch(`/api/showcase/visits?episodeId=${ep.id}`)
      .then((r) => r.json())
      .then((res) => {
        setVisits(res.visits || []);
      })
      .catch(() => {
        setVisits([]);
      })
      .finally(() => setLoadingVisits(false));
  }, [ep?.id]);

  const cat = ep ? categoryFromMaster(ep.cat) : 'red';
  const labelCat = labels[cat];

  // Table rows for variable transparency
  const rows = ep
    ? [
        [
          'Waktu tempuh ke tujuan terpilih',
          formatMinutes(ep.timeMin),
          `${ep.timeMethod || 'Proksi kecepatan'} (${formatKm(ep.distM)})`,
          'Metrik akses ke RS tujuan',
        ],
        [
          'Alternatif layak terdekat',
          ep.altOutside
            ? `${ep.altName || ep.altId} (Luar NTT)`
            : `${ep.altName || ep.altId || 'Tidak tercatat'} · ${formatMinutes(ep.altTimeMin)}`,
          ep.altOutside ? 'Wilayah NTB (di luar cakupan NTT)' : 'Kandidat faskes terdekat yang layak',
          ep.altOutside ? '⚠️ Alternatif di luar cakupan NTT' : 'Pembanding akses geografis',
        ],
        [
          'Selisih waktu tempuh (tambahan)',
          formatMinutes(ep.diffMin),
          'Waktu tujuan dikurangi alternatif',
          ep.diffMin != null && ep.diffMin > 0 ? `Lebih lama ${formatMinutes(ep.diffMin)}` : 'Sesuai / lebih dekat',
        ],
        [
          'Rasio waktu tempuh',
          ep.timeRatio != null ? `${ep.timeRatio.toFixed(2)}×` : 'Belum tersedia',
          'Waktu tujuan / waktu alternatif',
          ep.timeRatio != null && ep.timeRatio >= 1.5 ? '≥ 1,5× (prioritas simulasi)' : 'Normal',
        ],
        [
          'Jumlah alternatif lebih dekat',
          ep.nCloser != null ? `${ep.nCloser} faskes` : 'Belum tersedia',
          'Fasilitas layak dengan jarak/waktu lebih dekat',
          ep.nCloser && ep.nCloser >= 2 ? '≥ 2 alternatif layak' : 'Tersedia',
        ],
        [
          'Catatan alasan indikasi',
          getReasonLabel(ep.reason),
          'Simulasi alasan dari master',
          ep.reason !== 'tidak_ada' ? 'Alasan tercatat dalam skenario' : 'Tidak ada alasan khusus tercatat',
        ],
        [
          'Indeks indikasi fraud (simulasi)',
          ep.fraudIdx != null ? ep.fraudIdx.toFixed(3) : '—',
          'Skor sintetis master',
          'Simulasi prioritas penelaahan',
        ],
      ]
    : [];

  return (
    <dialog
      className="detail-dialog"
      ref={dialog}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="detail-title"
    >
      <header className="dialog-header">
        <div>
          <div className="eyebrow">TRANSPARANSI PENELAAHAN RUJUKAN</div>
          <h2 id="detail-title">
            {ep ? `Detail Episode Rujukan ${ep.id}` : 'Tentang SIGARA NTT Showcase'}
          </h2>
        </div>
        <button className="icon-button" aria-label="Tutup analisis" onClick={onClose}>
          <X size={20} />
        </button>
      </header>

      <div className="dialog-body">
        {/* Brand Banner for About Modal */}
        {!ep && (
          <div className="about-brand">
            <BrandLogo size={110} />
            <div>
              <span className="eyebrow">BANG JAKES · SIGARA NTT</span>
              <h3>Pendamping Penelaahan Rujukan Akuntabel.</h3>
              <p>
                Platform showcase Agentic GeoAI untuk seluruh Provinsi Nusa Tenggara Timur (NTT).
                Mengintegrasikan 3.683 episode rujukan, 10.776 kunjungan, 879 katalog titik fasilitas,
                dan 16 aset ilustrasi penginderaan jauh GeoAI.
              </p>
            </div>
          </div>
        )}

        {/* Selected Episode Summary */}
        {ep && (
          <>
            <div className={`analysis-summary ${cat}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className={`status-pill ${cat}`}>{labelCat}</span>
                {ep.hasGeoAI && (
                  <span
                    style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      padding: '4px 8px',
                      borderRadius: '5px',
                      fontSize: '9px',
                      fontWeight: 600,
                    }}
                  >
                    🛰️ Bukti GeoAI Tersedia
                  </span>
                )}
                {ep.altOutside && (
                  <span
                    style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      padding: '4px 8px',
                      borderRadius: '5px',
                      fontSize: '9px',
                      fontWeight: 600,
                    }}
                  >
                    ⚠️ Alternatif di Luar NTT
                  </span>
                )}
              </div>

              <h3 style={{ margin: '6px 0 10px', fontSize: '18px', fontWeight: 600, color: '#16382a' }}>
                {ep.fromName} → {ep.toName}
              </h3>

              <p style={{ margin: '4px 0', fontSize: '11px', color: '#566e60', lineHeight: 1.7 }}>
                Episode ini mencakup <strong>{ep.visitCount} kunjungan</strong> ({dateLabel(ep.firstDate)} s.d. {dateLabel(ep.lastDate)}).
                {ep.diffMin != null && ep.diffMin > 0
                  ? ` Pemilihan tujuan ini menambah waktu tempuh proksi sekitar ${formatMinutes(ep.diffMin)} dibandingkan alternatif layak terdekat.`
                  : ' Pilihan tujuan sesuai dengan proksi jarak terdekat atau memiliki alasan khusus.'}
              </p>
            </div>

            {/* Visit Timeline Section */}
            <h3 style={{ marginTop: '24px' }}>
              <Calendar size={18} /> Rincian Kunjungan pada Episode ({visits.length || ep.visitCount} Kunjungan)
            </h3>
            {loadingVisits ? (
              <p className="small-text">Memuat daftar kunjungan...</p>
            ) : visits.length > 0 ? (
              <div className="table-wrap" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>ID Kunjungan FKRTL</th>
                      <th>Tanggal FKTP</th>
                      <th>Tanggal FKRTL</th>
                      <th>Poli / Diagnosa</th>
                      <th>Fasilitas Asal &amp; Tujuan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((v, i) => (
                      <tr key={v.visitId || i}>
                        <td>{i + 1}</td>
                        <td>
                          <code>{v.visitId || '—'}</code>
                        </td>
                        <td>{dateLabel(v.dateFktp)}</td>
                        <td>{dateLabel(v.dateFkrtl)}</td>
                        <td>
                          {v.poli || v.diagnosa || 'Rujukan terintegrasi'}
                        </td>
                        <td>
                          {v.fromName} → {v.toName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="small-text">Data kunjungan sedang disinkronkan.</p>
            )}

            {/* Variables & Methods Table */}
            <h3 style={{ marginTop: '24px' }}>
              <GitBranch size={18} /> Variabel Proksi &amp; Parameter Master
            </h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Variabel</th>
                    <th>Nilai Skenario</th>
                    <th>Metode / Dasar</th>
                    <th>Makna dalam Simulasi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([name, val, method, note]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td className="table-value">{val}</td>
                      <td>{method}</td>
                      <td>{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="note">
              <Info size={15} />
              Kategori prioritas penelaahan rujukan ini berasal dari data master sintetis BPJS Healthkathon 2026.
              Angka jarak dan waktu menggunakan estimasi proksi akses geografis, bukan hasil rute lalu lintas langsung.
            </p>
          </>
        )}

        {/* Scope and Truthful Disclosure */}
        <h3 style={{ marginTop: '24px' }}>
          <ShieldCheck size={18} /> Ruang Lingkup &amp; Kejujuran Ilmiah (Truthful Disclosure)
        </h3>
        <div className="method-grid">
          <div>
            <h4>Cakupan Wilayah NTT</h4>
            <p>
              Mencakup seluruh 21 kabupaten/kota di Kepulauan Nusa Tenggara Timur (Flores, Sumba, Timor Barat, Alor, Lembata, Rote Ndao, Sabu Raijua) dengan batas resmi GADM 4.1.
            </p>
          </div>
          <div>
            <h4>Simulasi Tanpa Klaim Fraud</h4>
            <p>
              Label merah, oranye, dan hijau adalah prioritas pemeriksaan penelaahan (review priority) dalam simulasi POC, bukan pembuktian kecurangan atau penetapan status hukum.
            </p>
          </div>
          <div>
            <h4>Citra Satelit &amp; Sensor</h4>
            <p>
              Latar satelit menggunakan mosaik bebas awan EOX Sentinel-2 tahun 2024 (CC BY-NC-SA 4.0). Lapisan analisis analitis adalah simulasi raster sintetis untuk kebutuhan kompetisi POC.
            </p>
          </div>
          <div>
            <h4>Katalog Faskes</h4>
            <p>
              Memuat 879 fasilitas referensi berkoordinat valid di NTT. 10 episode rujukan memiliki alternatif terdekat di provinsi tetangga (NTB) yang tetap dipertahankan sesuai fakta data master.
            </p>
          </div>
        </div>

        <div className="source-list">
          <span>
            <Check size={14} /> Batas Wilayah: GADM 4.1 (Provinsi Nusa Tenggara Timur)
          </span>
          <span>
            <Check size={14} /> Citra Satelit: EOX Sentinel-2 Cloudless Mosaic 2024
          </span>
          <span>
            <Check size={14} /> Jurnal Rujukan: Kulk et al. (2023), Notti et al. (2023), Picos et al. (2019)
          </span>
          <span>
            <Check size={14} /> Master Data: 10.776 Kunjungan · 3.683 Episode · 879 Faskes Referensi
          </span>
        </div>
      </div>
    </dialog>
  );
}
