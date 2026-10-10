'use client';
import { useEffect, useRef } from 'react';
import { ArrowRight, Check, FileText, GitBranch, Info, MapPinned, ShieldCheck, X } from 'lucide-react';
import { explanation, labels, minutes, reasonLabels, type Assessment, type Referral, type ShowcaseData } from '@/lib/showcase';
import BrandLogo from './BrandLogo';

export default function CaseDetails({ data, referral: r, assessment: a, onClose }: { data: ShowcaseData; referral: Referral | null; assessment: Assessment | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const rows = r && a ? [
    ['Waktu ke RS tujuan', minutes(a.targetMinutes), 'Hasil Dijkstra', 'Nilai pembanding'],
    ['Alternatif tercepat yang layak', `${a.bestId ?? 'Tidak tersedia'} · ${minutes(a.bestMinutes)}`, 'Layanan + kapasitas + eligibility', 'Pembanding setelah penyaringan'],
    ['Tambahan waktu', minutes(a.extra), '≥ 8 menit', a.rules.extra ? 'Terpenuhi' : 'Tidak terpenuhi'],
    ['Rasio waktu', a.ratio === null ? 'Belum tersedia' : `${a.ratio.toFixed(2)}×`, '≥ 1,5×', a.rules.ratio ? 'Terpenuhi' : 'Tidak terpenuhi'],
    ['Alternatif lebih cepat', `${a.alternatives.length} RS`, '≥ 2 RS', a.rules.alternatives ? 'Terpenuhi' : 'Tidak terpenuhi'],
    ['Kelengkapan bukti', r.evidence ? 'Lengkap' : 'Belum lengkap', 'Harus lengkap untuk dinilai', r.evidence ? 'Terpenuhi' : 'Perlu data'],
    ['Alasan khusus terverifikasi', r.verified && r.reason !== 'tidak_ada' ? 'Ada' : 'Tidak ada', 'Alasan sah diperhitungkan', reasonLabels[r.reason] ?? r.reason.replaceAll('_', ' ')],
  ] : [];
  return <dialog className="detail-dialog" ref={dialog} onClose={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="detail-title">
    <header className="dialog-header"><div><div className="eyebrow">TRANSPARANSI PEMERIKSAAN</div><h2 id="detail-title">{r ? `Analisis ${r.id}` : 'Tentang showcase SIGARA'}</h2></div><button className="icon-button" aria-label="Tutup analisis" onClick={onClose}><X size={20} /></button></header>
    <div className="dialog-body">
      {!r && <div className="about-brand"><BrandLogo size={120} /><div><span className="eyebrow">BANG JAKES · SIGARA</span><h3>Pendamping pemeriksaan rujukan.</h3><p>Showcase Agentic GeoAI untuk rujukan akuntabel di Kota Kupang. Bang Jakes menjadi identitas visual ruang pemeriksaan dan simulasi agen.</p></div></div>}
      {r && a && <><div className={`analysis-summary ${a.category}`}><span className={`status-pill ${a.category}`}>{labels[a.category]}</span><p>{explanation(r, a)}</p><span className="small-text">{r.from} → {r.to} · {r.service} · {r.emergency ? 'Kondisi darurat tercatat dalam skenario' : 'Non-darurat dalam skenario'}</span></div>
      <h3><GitBranch size={18} /> Variabel utama &amp; aturan</h3>
      <div className="table-wrap"><table><thead><tr><th>Variabel</th><th>Nilai kasus</th><th>Aturan / metode</th><th>Peran dalam hasil</th></tr></thead><tbody>{rows.map(([name, value, rule, meaning]) => <tr key={name}><td>{name}</td><td className="table-value">{value}</td><td>{rule}</td><td>{meaning}</td></tr>)}</tbody></table></div>
      <p className="note"><Info size={15} />Triase menggunakan kombinasi aturan. Tidak ada bobot persentase, skor probabilitas fraud, atau kontribusi model yang direka.</p>
      <h3><MapPinned size={18} /> Fasilitas pembanding</h3>
      <div className="table-wrap"><table><thead><tr><th>RS sintetis</th><th>Waktu</th><th>Layanan sesuai</th><th>Kapasitas saat rujukan</th><th>Peran</th></tr></thead><tbody>{Object.keys(data.capabilities).map(id => {
        const route = data.routes.find(x => x.from === r.from && x.to === id);
        return <tr key={id}><td>{id}</td><td>{minutes(route?.minutes ?? null)}</td><td>{data.capabilities[id][r.service] ? 'Ya' : 'Tidak'}</td><td>{r.capacities[id] === true ? 'Tersedia' : r.capacities[id] === false ? 'Tidak tersedia' : 'Belum diketahui'}</td><td>{id === r.to ? 'Tujuan dipilih' : a.alternatives.some(x => x.id === id) ? 'Alternatif lebih cepat' : 'Pembanding'}</td></tr>;
      })}</tbody></table></div>
      <h3><FileText size={18} /> Jejak bukti kasus</h3><div className="evidence-grid"><div><span>Dokumen demo</span><strong>{r.documentId}</strong><p>Catatan sintetis; tidak memuat identitas atau dokumen pasien.</p></div><div><span>Alasan tercatat</span><strong>{reasonLabels[r.reason] ?? r.reason.replaceAll('_', ' ')}</strong><p>{r.verified ? 'Ditandai terverifikasi oleh generator data demo.' : 'Belum ada alasan khusus terverifikasi.'}</p></div><div><span>Asal skenario</span><strong>{r.showcaseAdjusted ? 'Skenario prioritas showcase' : 'Data sintetis dasar Kota Kupang'}</strong><p>{r.showcaseAdjusted ? 'Tujuan dan kondisi sintetis disusun ulang untuk demonstrasi; rute dan ambang tetap.' : 'Diambil dari data dasar yang sudah disaring dengan batas Kota Kupang.'}</p></div></div>
      {a.missing.length > 0 && <div className="missing-box"><strong>Yang perlu dilengkapi</strong><ul>{a.missing.map(x => <li key={x}>{x}</li>)}</ul></div>}</>}
      <h3><GitBranch size={18} /> Alur data yang dapat ditelusuri</h3>
      <div className="flow-diagram">{['Rujukan sintetis', 'Validasi data', 'Rute Dijkstra', 'Layanan & kapasitas', 'Alasan & bukti', 'Aturan triase', 'SIGARA Index'].map((x, i) => <div key={x}><span><small>{String(i + 1).padStart(2, '0')}</small>{x}</span>{i < 6 && <ArrowRight size={16} />}</div>)}</div>
      <h3><ShieldCheck size={18} /> Ruang lingkup showcase</h3>
      <div className="method-grid"><div><h4>Yang dihitung</h4><p>24 rute dari 6 FKTP ke 4 RS sintetis, pada jaringan jalan berarah di dalam batas Kota Kupang. Waktu memakai asumsi kecepatan tetap per kelas jalan.</p></div><div><h4>Yang disimulasikan</h4><p>Orchestrator dan enam agen spesialis, alur pengumpulan bukti, serta satu putaran pemantauan berkala. Tidak ada LLM, RAG aktif, atau pemeriksaan otomatis di latar belakang.</p></div><div><h4>Skenario indikator</h4><p>25 kasus merah, 52 oranye, 1.003 hijau. Sebanyak 25 kasus dasar disusun ulang menjadi skenario prioritas, kemudian dinilai kembali dengan aturan yang sama.</p></div><div><h4>Makna warna</h4><p>Merah: prioritas pemeriksaan. Oranye: data belum cukup. Hijau: sesuai model atau alasan terdokumentasi. Warna tidak menetapkan adanya fraud.</p></div></div>
      <div className="source-list"><span><Check size={14} />Batas: GADM 4.1 · Kota Kupang / 5371</span><span><Check size={14} />Jalan: OpenStreetMap · snapshot 4 Oktober 2026 · ODbL</span><span><Check size={14} />94 objek fasilitas publik OSM sebagai konteks, terpisah dari fasilitas sintetis</span></div>
      <p className="small-text">Jaringan jalan asal mencakup kawasan urban; sebagian selatan kota belum tercakup. Waktu bukan kondisi lalu lintas langsung. Objek publik belum dideduplikasi menjadi institusi dan belum diverifikasi kemitraan JKN. Kondisi darurat merupakan konteks penelaahan, bukan aturan klinis otomatis.</p>
      <div className="source-links"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Sumber OpenStreetMap ↗</a><a href="https://openfreemap.org/" target="_blank" rel="noreferrer">Basemap OpenFreeMap ↗</a><span>Versi {data.metadata.version}</span></div>
    </div>
  </dialog>;
}
