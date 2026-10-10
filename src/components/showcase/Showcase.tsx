'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bot, Check, CheckCircle2, ChevronDown, ChevronRight, CircleAlert, Clock3, Database, FileText, Filter as FilterIcon, Info, Layers3, LoaderCircle, MapPinned, Play, Route as RouteIcon, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { assess, dateLabel, explanation, formatNumber, labels, minutes, reasonLabels, type Assessment, type Category, type Filter, type Referral, type ShowcaseData } from '@/lib/showcase';
import CaseDetails from './CaseDetails';
const KupangMap = dynamic(() => import('./KupangMap'), { ssr: false, loading: () => <div className="map-loading"><MapPinned size={30} /><span>Menyiapkan peta Kota Kupang…</span></div> });
const agents = [
  { name: 'Agen Data', action: 'Memeriksa kelengkapan dan cakupan kota', icon: Database },
  { name: 'Agen Kapabilitas', action: 'Menyaring layanan dan kapasitas sintetis', icon: ShieldCheck },
  { name: 'Agen GeoAI', action: 'Membaca hasil rute Dijkstra', icon: RouteIcon },
  { name: 'Agen Konteks Klinis', action: 'Menelusuri catatan alasan sintetis', icon: FileText },
  { name: 'Agen Pola Rujukan', action: 'Merangkum pasangan asal–tujuan', icon: Activity },
  { name: 'Agen Bukti', action: 'Menyusun ringkasan dan sumber', icon: CheckCircle2 },
];
const categories: Category[] = ['red', 'orange', 'green'];
type Tab = 'summary' | 'evidence' | 'agents';

export default function Showcase() {
  const [data, setData] = useState<ShowcaseData | null>(null), [source, setSource] = useState('snapshot'), [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>('red'), [search, setSearch] = useState(''), [month, setMonth] = useState('all'), [limit, setLimit] = useState(12);
  const [selectedId, setSelectedId] = useState<string | null>(null), [publicLayer, setPublicLayer] = useState(false), [routesLayer, setRoutesLayer] = useState(true);
  const [tab, setTab] = useState<Tab>('summary'), [detail, setDetail] = useState<'case' | 'about' | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [step, setStep] = useState(-1), [completed, setCompleted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/showcase', { signal: controller.signal }).then(r => { if (!r.ok) throw Error(); return r.json(); }).then(({ data, source }) => { setData(data); setSource(source); }).catch(e => { if (e.name !== 'AbortError') setError(true); });
    return () => { controller.abort(); if (timer.current) clearInterval(timer.current); };
  }, []);
  const assessments = useMemo(() => new Map(data?.cases.map(r => [r.id, assess(r, data)]) ?? []), [data]);
  const periodCases = useMemo(() => data?.cases.filter(r => month === 'all' || r.month === month) ?? [], [data, month]);
  const counts = useMemo(() => periodCases.reduce((s, r) => { s[assessments.get(r.id)!.category]++; return s; }, { red: 0, orange: 0, green: 0 }), [periodCases, assessments]);
  const filtered = useMemo(() => periodCases.filter(r => (filter === 'all' || assessments.get(r.id)?.category === filter) && `${r.id} ${r.from} ${r.to} ${r.service}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => {
    const x = assessments.get(a.id)!, y = assessments.get(b.id)!;
    return categories.indexOf(x.category) - categories.indexOf(y.category) || (y.extra ?? -1) - (x.extra ?? -1) || a.id.localeCompare(b.id);
  }), [periodCases, filter, search, assessments]);
  // Selection always belongs to the current filter, including empty and searched states.
  const selected = filtered.find(r => r.id === selectedId) ?? filtered[0] ?? null;
  const assessment = selected ? assessments.get(selected.id)! : null;
  function changeFilter(value: Filter) { setFilter(value); setSearch(''); setSelectedId(null); setLimit(12); }
  function select(id: string) { setSelectedId(id); setTab('summary'); setRoutesLayer(true); setFocusRequest(n => n + 1); }
  function runSimulation() {
    if (timer.current) return;
    setTab('agents'); setCompleted(false); setStep(0);
    let next = 0;
    timer.current = setInterval(() => { next++; setStep(next); if (next === agents.length) { clearInterval(timer.current!); timer.current = null; setCompleted(true); setStep(-1); } }, 850);
  }
  if (!data) return <div className="boot-screen"><div className="brand-mark"><RouteIcon size={28} /></div><h1>SIGARA</h1><p>{error ? 'Data showcase belum dapat dimuat.' : 'Menyiapkan ruang pemeriksaan Kota Kupang…'}</p>{error ? <button className="primary-button" onClick={() => location.reload()}>Coba lagi</button> : <LoaderCircle className="spin" size={20} />}</div>;
  const batchCounts = data.cases.reduce((s, r) => { s[assessments.get(r.id)!.category]++; return s; }, { red: 0, orange: 0, green: 0 });
  const running = step >= 0;
  return <div className="sigara-app">
    <header className="app-header"><a href="/" className="brand" aria-label="SIGARA beranda"><div className="brand-mark"><RouteIcon size={24} strokeWidth={1.8} /></div><div><strong>SIGARA<span> / </span><small>GeoAI</small></strong><p>Rujukan akuntabel, berbasis bukti.</p></div></a><div className="header-context"><MapPinned size={15} /><span>Kota Kupang</span><span className="header-divider" /><span>Healthkathon 2026</span></div><div className="header-actions"><span className="demo-badge"><span />Demo showcase</span><button className="text-button" onClick={() => setDetail('about')}><Info size={16} /><span>Tentang demo</span></button></div></header>
    <main className="main-content">
      <section className="page-heading"><div><div className="eyebrow">RUANG PEMERIKSAAN RUJUKAN</div><h1>Perhatian pada kasus yang tepat.</h1></div><div className="heading-period"><Clock3 size={15} /><label className="sr-only" htmlFor="period">Periode rujukan</label><select id="period" value={month} onChange={e => { setMonth(e.target.value); setSelectedId(null); setLimit(12); }}><option value="all">April – September 2026</option>{['April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September'].map((m, i) => <option key={m} value={`2026-${String(i + 4).padStart(2, '0')}`}>{m} 2026</option>)}</select><ChevronDown size={14} /></div></section>
      <section className="index-section" aria-label="SIGARA Index">
        <div className="index-title"><div className="index-name"><ShieldCheck size={20} /><h2>SIGARA Index</h2></div><p>Indeks Prioritas Pemeriksaan Rujukan</p><button className={`total-button ${filter === 'all' ? 'active' : ''}`} onClick={() => changeFilter('all')} aria-pressed={filter === 'all'}>{formatNumber(periodCases.length)} kasus sintetis <ArrowUpRight size={14} /></button></div>
        {categories.map((category, i) => { const Icon = [CircleAlert, FileText, CheckCircle2][i]; return <button key={category} className={`index-card ${category} ${filter === category ? 'selected' : ''}`} aria-pressed={filter === category} onClick={() => changeFilter(category)}><div className="index-card-top"><span className="index-icon"><Icon size={18} /></span><span>{labels[category]}</span><ArrowUpRight size={15} className="index-arrow" /></div><div className="index-card-bottom"><strong>{formatNumber(counts[category])}</strong><span>kasus</span><small>{i === 0 ? 'Telusuri alasan & alternatif' : i === 1 ? 'Lengkapi bukti pendukung' : 'Sesuai model / beralasan'}</small></div></button>; })}
      </section>
      <div className="monitor-strip"><div><span className={`monitor-dot ${running ? 'working' : ''}`} /><strong>{running ? `Simulasi: ${agents[step]?.name}` : completed ? 'Simulasi pemeriksaan selesai' : 'Ringkasan batch demo tersedia'}</strong><span className="monitor-meta">10 Okt 2026 · Data sintetis · Simulasi agen</span></div><button className="simulation-button" disabled={running} onClick={runSimulation}>{running ? <LoaderCircle size={14} className="spin" /> : <Play size={13} />} {running ? 'Memeriksa…' : 'Putar simulasi agen'}</button></div>
      <section className="workspace">
        <aside className="case-panel" aria-label="Daftar kasus rujukan"><div className="panel-heading"><h2>Kasus rujukan</h2><span className="count-pill">{filtered.length}</span></div><div className="case-tools"><div className="search-field"><Search size={15} /><input aria-label="Cari kasus atau fasilitas" placeholder="Cari kasus atau fasilitas…" value={search} onChange={e => { setSearch(e.target.value); setLimit(12); }} />{search && <button aria-label="Hapus pencarian" onClick={() => setSearch('')}><X size={13} /></button>}</div><div className="active-filter"><FilterIcon size={12} /><span>{filter === 'all' ? 'Semua status' : labels[filter]}</span><small>↓ Selisih waktu</small></div></div>
          <div className="case-list">{filtered.length ? filtered.slice(0, limit).map(r => { const a = assessments.get(r.id)!; return <button className={`case-card ${selected?.id === r.id ? 'selected' : ''}`} key={r.id} onClick={() => select(r.id)} aria-pressed={selected?.id === r.id}><div className="case-title"><span className={`status-dot ${a.category}`} /><strong>{r.id}</strong><ChevronRight size={14} /></div><div className="case-route">{r.from}<ArrowRight size={12} />{r.to}</div><p>{r.service}</p><div className="case-bottom"><span>{dateLabel(r.date)}</span><span className={a.category === 'red' ? 'extra-red' : ''}>{a.extra === null ? 'Perlu data' : `+${a.extra.toLocaleString('id-ID', { maximumFractionDigits: 1 })} mnt`}</span></div></button>; }) : <div className="empty-state"><Search size={24} /><strong>Tidak ada kasus</strong><p>Ubah kata pencarian, status, atau periode.</p></div>}{limit < filtered.length && <button className="load-more" onClick={() => setLimit(x => x + 12)}>Tampilkan 12 berikutnya</button>}</div>
          <div className="layer-controls"><h3><Layers3 size={14} />Layer peta</h3><label><input type="checkbox" checked={routesLayer} onChange={e => setRoutesLayer(e.target.checked)} /><span>Rute kasus & alternatif</span></label><label><input type="checkbox" checked={publicLayer} onChange={e => setPublicLayer(e.target.checked)} /><span>Fasilitas publik OSM</span><small>94</small></label></div>
        </aside>
        <section className="map-panel" aria-label="Peta dan rute kasus"><KupangMap data={data} cases={filtered} selected={selected} assessment={assessment} publicLayer={publicLayer} routesLayer={routesLayer} focusRequest={focusRequest} onSelect={select} /><div className="map-bottom"><div><span className="eyebrow">CAKUPAN PEMERIKSAAN</span><p><strong>{filtered.length} kasus</strong> · {new Set(filtered.map(r => r.from)).size} FKTP asal · hanya dalam batas kota</p></div><span className="map-count">6 FKTP / 4 RS sintetis</span></div></section>
        <aside className="analysis-panel" aria-label="Analisis kasus"><div className="panel-heading"><h2><Sparkles size={16} /> Analisis GeoAI</h2><span className="tiny-badge">SHOWCASE</span></div><div className="analysis-tabs" role="tablist" aria-label="Bagian analisis">{(['summary', 'evidence', 'agents'] as Tab[]).map((t, i) => <button role="tab" id={`tab-${t}`} aria-selected={tab === t} aria-controls={`panel-${t}`} className={tab === t ? 'active' : ''} key={t} onClick={() => setTab(t)}>{['Ringkasan', 'Bukti', 'Jejak agen'][i]}</button>)}</div>
          <div className="analysis-content">
            {tab === 'agents' ? <div role="tabpanel" id="panel-agents" aria-labelledby="tab-agents"><div className="agent-header"><Bot size={25} /><div><strong>Orchestrator SIGARA</strong><p>6 agen spesialis · simulasi alur</p></div></div><div className="agent-timeline">{agents.map((agent, i) => { const Icon = agent.icon, done = completed || (running && i < step), active = running && i === step; return <div className={`agent-step ${done ? 'done' : ''} ${active ? 'current' : ''}`} key={agent.name}><span className="agent-node">{done ? <Check size={14} /> : active ? <LoaderCircle size={14} className="spin" /> : <Icon size={14} />}</span><div><strong>{agent.name}</strong><p>{agent.action}</p><small>{done ? 'Selesai dalam simulasi' : active ? 'Sedang disimulasikan…' : 'Tahap simulasi'}</small></div></div>; })}</div>{completed && <div className="simulation-result" aria-live="polite"><CheckCircle2 size={17} /><div><strong>{formatNumber(data.cases.length)} kasus dirangkum</strong><p>{formatNumber(batchCounts.red)} prioritas · {formatNumber(batchCounts.orange)} perlu data · {formatNumber(batchCounts.green)} tidak diprioritaskan</p></div></div>}<p className="small-text">Putaran ini memperagakan pemeriksaan berkala. LLM dan RAG belum aktif; angka berasal dari data sintetis dan aturan yang dapat diperiksa.</p></div>
              : selected && assessment ? <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
                <div className="selected-case-heading"><span className={`status-pill ${assessment.category}`}>{labels[assessment.category]}</span><h3>{selected.id}</h3><p>{selected.from} <ArrowRight size={12} /> {selected.to}</p></div>
                {tab === 'summary' ? <><div className={`finding ${assessment.category}`}><span>Mengapa kasus ini ditandai?</span><p>{explanation(selected, assessment)}</p></div><div className="key-variables"><div><span>Waktu ke tujuan</span><strong>{minutes(assessment.targetMinutes)}</strong></div><div><span>Alternatif tercepat</span><strong>{minutes(assessment.bestMinutes)}</strong></div><div><span>Tambahan waktu</span><strong className={assessment.rules.extra ? 'extra-red' : ''}>{minutes(assessment.extra)}</strong></div><div><span>Rasio perjalanan</span><strong>{assessment.ratio === null ? '—' : `${assessment.ratio.toLocaleString('id-ID', { maximumFractionDigits: 1 })}×`}</strong></div></div><div className="alternatives-title"><h4>Alternatif lebih cepat</h4><span>{assessment.alternatives.length} RS</span></div>{assessment.alternatives.length ? assessment.alternatives.map((a, i) => <div className="alternative-row" key={a.id}><span className="alternative-number">{i + 1}</span><div><strong>{a.id}</strong><span>Layanan & kapasitas sesuai</span></div><b>{minutes(a.minutes)}</b></div>) : <p className="small-text">Belum ada alternatif lebih cepat yang memenuhi seluruh syarat pada kasus ini.</p>}</>
                : <><div className="evidence-item"><FileText size={18} /><div><span>Dokumen sintetis</span><strong>{selected.documentId}</strong><p>{selected.evidence ? 'Kelengkapan bukti: lengkap' : 'Kelengkapan bukti: perlu dilengkapi'}</p></div></div><div className="evidence-item"><ShieldCheck size={18} /><div><span>Alasan rujukan</span><strong>{reasonLabels[selected.reason] ?? selected.reason.replaceAll('_', ' ')}</strong><p>{selected.verified ? 'Terverifikasi dalam skenario' : 'Belum ada alasan khusus terverifikasi'}</p></div></div><div className="evidence-item"><RouteIcon size={18} /><div><span>Jaringan jalan</span><strong>OSM · Dijkstra</strong><p>Snapshot 4 Okt 2026. Kecepatan model, bukan lalu lintas langsung.</p></div></div><div className="evidence-item"><Database size={18} /><div><span>Asal kasus</span><strong>{selected.showcaseAdjusted ? 'Skenario prioritas showcase' : 'Data dasar sintetis'}</strong><p>{selected.showcaseAdjusted ? 'Disusun ulang untuk demo, lalu dihitung dengan aturan yang sama.' : 'Lolos penyaringan batas Kota Kupang.'}</p></div></div>{assessment.missing.length > 0 && <div className="missing-box"><strong>Perlu dilengkapi</strong><ul>{assessment.missing.map(x => <li key={x}>{x}</li>)}</ul></div>}</>}
                <button className="detail-button" onClick={() => setDetail('case')}>Lihat analisis mendalam<ArrowUpRight size={16} /></button><p className="analysis-disclaimer">Prioritas pemeriksaan, bukan penetapan fraud.</p>
              </div> : <div className="empty-state"><FileText size={25} /><strong>Pilih kasus pada daftar</strong><p>Hasil dan bukti akan tampil di sini.</p></div>}
          </div>
        </aside>
      </section>
      <footer className="app-footer"><span><span className="status-dot green" />{source === 'neon' ? 'Sumber data: Neon' : 'Sumber data: snapshot demo'}<span className="footer-separator">/</span>{data.metadata.version}</span><span>Data sintetis · Batas Kota Kupang · Simulasi agen</span></footer>
    </main>
    {detail && <CaseDetails data={data} referral={detail === 'case' ? selected : null} assessment={detail === 'case' ? assessment : null} onClose={() => setDetail(null)} />}
  </div>;
}
