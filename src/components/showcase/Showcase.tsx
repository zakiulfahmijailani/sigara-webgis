'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  Compass,
  Database,
  FileText,
  Filter as FilterIcon,
  Info,
  Layers,
  Layers3,
  LoaderCircle,
  MapPin,
  MapPinned,
  Play,
  RotateCcw,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Sparkles,
  X,
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
  monthLabel,
  type Category,
  type Episode,
  type Filter,
  type GeoAIImage,
  type ShowcaseData,
} from '@/lib/showcase';
import CaseDetails from './CaseDetails';
import BrandLogo from './BrandLogo';
import GeoAIViewer from './GeoAIViewer';

const NTTMap = dynamic(() => import('./NTTMap'), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <MapPinned size={32} />
      <span>Menyiapkan peta Kepulauan NTT…</span>
    </div>
  ),
});

const agents = [
  { name: 'Agen Data & Wilayah', action: 'Memeriksa cakupan master rujukan NTT (21 kab/kota)', icon: Database },
  { name: 'Agen Kapabilitas Faskes', action: 'Menyaring layanan dan kapasitas 879 faskes referensi', icon: ShieldCheck },
  { name: 'Agen GeoAI & Aksesibilitas', action: 'Menghitung proksi jarak dan waktu tempuh fasilitas', icon: RouteIcon },
  { name: 'Agen Konteks Penginderaan Jauh', action: 'Mencocokkan citra Sentinel-2 dan overlay indeks sintetis', icon: Sparkles },
  { name: 'Agen Pola Rujukan', action: 'Menganalisis pasangan OD dan alternatif terdekat', icon: Activity },
  { name: 'Agen Sintesis Bukti', action: 'Menyusun berkas penelaahan akuntabilitas rujukan', icon: CheckCircle2 },
];

const categories: Category[] = ['red', 'orange', 'green'];
type Tab = 'summary' | 'evidence' | 'agents';

export default function Showcase() {
  const [data, setData] = useState<ShowcaseData | null>(null);
  const [source, setSource] = useState('snapshot');
  const [error, setError] = useState(false);

  // Filters
  const [filter, setFilter] = useState<Filter>('red');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('all');
  const [district, setDistrict] = useState('all');
  const [onlyGeoAI, setOnlyGeoAI] = useState(false);

  // Pagination for episode list (50 per page for high performance)
  const [pageSize, setPageSize] = useState(50);

  // Selected State
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeGeoAIImage, setActiveGeoAIImage] = useState<GeoAIImage | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.8);
  const [showSatelliteBackdrop, setShowSatelliteBackdrop] = useState(true);

  // UI state
  const [tab, setTab] = useState<Tab>('summary');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);

  // Simulated Agent Runner
  const [step, setStep] = useState(-1);
  const [completed, setCompleted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/showcase', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(({ data, source }) => {
        setData(data);
        setSource(source);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(true);
      });
    return () => {
      controller.abort();
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  // Filter episodes by month and district first
  const periodEpisodes = useMemo(() => {
    if (!data?.episodes) return [];
    return data.episodes.filter((e) => {
      const matchMonth = month === 'all' || e.month === month;
      const matchDist = district === 'all' || e.kabAsal === district;
      return matchMonth && matchDist;
    });
  }, [data?.episodes, month, district]);

  // Counts by category
  const counts = useMemo(() => {
    const res = { red: 0, orange: 0, green: 0 };
    for (const e of periodEpisodes) {
      const c = categoryFromMaster(e.cat);
      res[c]++;
    }
    return res;
  }, [periodEpisodes]);

  // Filtered episodes based on active category filter, search, and onlyGeoAI
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return periodEpisodes
      .filter((e) => {
        const c = categoryFromMaster(e.cat);
        const matchCategory = filter === 'all' || c === filter;
        const matchGeoAI = !onlyGeoAI || e.hasGeoAI;
        const matchSearch =
          !term ||
          e.id.toLowerCase().includes(term) ||
          e.fromName.toLowerCase().includes(term) ||
          e.toName.toLowerCase().includes(term) ||
          e.kabAsal.toLowerCase().includes(term) ||
          e.kabTujuan.toLowerCase().includes(term);

        return matchCategory && matchGeoAI && matchSearch;
      })
      .sort((a, b) => {
        // Sort priority: TINGGI_SIM first, then hasGeoAI, then diffMin descending
        const ca = categoryFromMaster(a.cat);
        const cb = categoryFromMaster(b.cat);
        const catDiff = categories.indexOf(ca) - categories.indexOf(cb);
        if (catDiff !== 0) return catDiff;
        if (a.hasGeoAI && !b.hasGeoAI) return -1;
        if (!a.hasGeoAI && b.hasGeoAI) return 1;
        return (b.diffMin ?? -1) - (a.diffMin ?? -1) || a.id.localeCompare(b.id);
      });
  }, [periodEpisodes, filter, onlyGeoAI, search]);

  // Selected episode
  const selected = useMemo(() => {
    if (!filtered.length) return null;
    if (selectedId) {
      const found = filtered.find((e) => e.id === selectedId);
      if (found) return found;
    }
    // Default to first item (e.g. Sikka or Manggarai GeoAI episode if in filter)
    return filtered[0];
  }, [filtered, selectedId]);

  // Auto-sync active GeoAI image when selected episode changes
  useEffect(() => {
    if (!selected || !data?.geoai) {
      setActiveGeoAIImage(null);
      return;
    }
    const matchingImages = data.geoai.images.filter(
      (img) => String(img.episode) === String(selected.id)
    );
    if (matchingImages.length > 0) {
      // Default to scenario A
      setActiveGeoAIImage(matchingImages[0]);
    } else {
      setActiveGeoAIImage(null);
    }
  }, [selected?.id, data?.geoai]);

  function changeFilter(val: Filter) {
    setFilter(val);
    setSearch('');
    setSelectedId(null);
    setPageSize(50);
  }

  function selectEpisode(id: string) {
    setSelectedId(id);
    setFocusRequest((n) => n + 1);
  }

  function runSimulation() {
    if (timer.current) return;
    setTab('agents');
    setCompleted(false);
    setStep(0);
    let next = 0;
    timer.current = setInterval(() => {
      next++;
      setStep(next);
      if (next === agents.length) {
        clearInterval(timer.current!);
        timer.current = null;
        setCompleted(true);
        setStep(-1);
      }
    }, 750);
  }

  if (!data) {
    return (
      <div className="boot-screen">
        <BrandLogo className="boot-logo" size={144} priority />
        <h1>SIGARA NTT</h1>
        <p>
          {error
            ? 'Data showcase NTT belum dapat dimuat.'
            : 'Menyiapkan ruang pemeriksaan rujukan Provinsi NTT (3.683 episode)…'}
        </p>
        {error ? (
          <button className="primary-button" onClick={() => location.reload()}>
            Coba lagi
          </button>
        ) : (
          <LoaderCircle className="spin" size={24} />
        )}
      </div>
    );
  }

  const selectedCat = selected ? categoryFromMaster(selected.cat) : 'red';
  const running = step >= 0;

  return (
    <div className="sigara-app">
      {/* App Header */}
      <header className="app-header">
        <a href="/" className="brand" aria-label="SIGARA beranda">
          <BrandLogo className="header-logo" size={56} priority decorative />
          <div>
            <strong>
              SIGARA
            </strong>
            <p>Sistem Informasi Geografis Agentik untuk Rujukan Akuntabel</p>
          </div>
        </a>

        <div className="header-context">
          <MapPinned size={15} />
          <span>Provinsi Nusa Tenggara Timur</span>
          <span className="header-divider" />
          <span>Healthkathon 2026</span>
        </div>

        <div className="header-actions">
          <span className="demo-badge">
            <span />
            Showcase NTT v2.0
          </span>
          <button className="text-button" onClick={() => setDetailModalOpen(true)}>
            <Info size={16} />
            <span>Tentang showcase</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="main-content">
        {/* Page Heading & Global Selectors */}
        <section className="page-heading">
          <div>
            <div className="eyebrow">RUANG PEMERIKSAAN RUJUKAN PROVINSI NTT</div>
            <h1>Prioritas pada episode yang memerlukan pembuktian.</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* District Selector */}
            <div className="heading-period" style={{ padding: '7px 11px' }}>
              <MapPin size={14} />
              <label className="sr-only" htmlFor="district">
                Kabupaten/Kota
              </label>
              <select
                id="district"
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  setSelectedId(null);
                  setPageSize(50);
                }}
              >
                <option value="all">Seluruh NTT (21 Kab/Kota)</option>
                {data.summary.districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} />
            </div>

            {/* Period Selector */}
            <div className="heading-period" style={{ padding: '7px 11px' }}>
              <Clock3 size={14} />
              <label className="sr-only" htmlFor="period">
                Periode rujukan
              </label>
              <select
                id="period"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setSelectedId(null);
                  setPageSize(50);
                }}
              >
                <option value="all">Tahun 2024 (12 Bulan)</option>
                {data.summary.months.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} />
            </div>
          </div>
        </section>

        {/* SIGARA Index Category Tiles */}
        <section className="index-section" aria-label="SIGARA Index">
          <div className="index-title">
            <div className="index-name">
              <ShieldCheck size={20} />
              <h2>SIGARA Index</h2>
            </div>
            <p>Indeks Prioritas Penelaahan Rujukan</p>
            <button
              className={`total-button ${filter === 'all' && !onlyGeoAI ? 'active' : ''}`}
              onClick={() => {
                changeFilter('all');
                setOnlyGeoAI(false);
              }}
              aria-pressed={filter === 'all' && !onlyGeoAI}
            >
              {formatNumber(periodEpisodes.length)} episode ({formatNumber(data.summary.totals.visits)} kunjungan)
              <ArrowUpRight size={14} />
            </button>
          </div>

          {categories.map((category, i) => {
            const Icon = [CircleAlert, FileText, CheckCircle2][i];
            const isSelected = filter === category && !onlyGeoAI;
            const catVisitCount = data.summary.visitCategories[
              category === 'red' ? 'TINGGI_SIM' : category === 'orange' ? 'SEDANG_SIM' : 'RENDAH_SIM'
            ];

            return (
              <button
                key={category}
                className={`index-card ${category} ${isSelected ? 'selected' : ''}`}
                aria-pressed={isSelected}
                onClick={() => {
                  changeFilter(category);
                  setOnlyGeoAI(false);
                }}
              >
                <div className="index-card-top">
                  <span className="index-icon">
                    <Icon size={18} />
                  </span>
                  <span>{labels[category]}</span>
                  <ArrowUpRight size={15} className="index-arrow" />
                </div>
                <div className="index-card-bottom">
                  <strong>{formatNumber(counts[category])}</strong>
                  <span>episode ({formatNumber(catVisitCount)} kunjungan)</span>
                  <small>
                    {i === 0
                      ? 'Telusuri alasan & bukti alternatif'
                      : i === 1
                      ? 'Lengkapi data penunjang'
                      : 'Sesuai proksi akses terdekat'}
                  </small>
                </div>
              </button>
            );
          })}
        </section>

        {/* Monitoring & Simulation Status Strip */}
        <div className="monitor-strip">
          <div>
            <span className={`monitor-dot ${running ? 'working' : ''}`} />
            <strong>
              {running
                ? `Simulasi Agen: ${agents[step]?.name}`
                : completed
                ? 'Simulasi orkestrasi pemeriksaan NTT selesai'
                : 'Pemeriksaan batch 3.683 episode NTT aktif'}
            </strong>
            <span className="monitor-meta">
              Master 2024 · 879 Faskes Referensi · 16 Aset GeoAI · Data Simulasi POC
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className={`simulation-button ${onlyGeoAI ? 'active-filter-btn' : ''}`}
              style={{
                background: onlyGeoAI ? '#e0f2fe' : '#f9fcf6',
                borderColor: onlyGeoAI ? '#0284c7' : '#d5e0d6',
                color: onlyGeoAI ? '#0369a1' : '#447461',
                fontWeight: onlyGeoAI ? 600 : 500,
              }}
              onClick={() => {
                setOnlyGeoAI(!onlyGeoAI);
                setSelectedId(null);
              }}
            >
              <Sparkles size={12} /> {onlyGeoAI ? 'Tampilkan Semua Episode' : 'Hanya Bukti GeoAI (8)'}
            </button>

            <button className="simulation-button" disabled={running} onClick={runSimulation}>
              {running ? <LoaderCircle size={13} className="spin" /> : <Play size={13} />}
              {running ? 'Memeriksa…' : 'Simulasi Agen'}
            </button>
          </div>
        </div>

        {/* Workspace Panels (Case List | Interactive Map | Analysis & GeoAI) */}
        <section className="workspace">
          {/* Aside 1: Episode List Panel */}
          <aside className="case-panel" aria-label="Daftar episode rujukan">
            <div className="panel-heading">
              <h2>
                <Layers3 size={15} /> Episode Rujukan
              </h2>
              <span className="count-pill">{formatNumber(filtered.length)} episode</span>
            </div>

            <div className="case-tools">
              <div className="search-field">
                <Search size={15} />
                <input
                  aria-label="Cari episode, faskes, atau kabupaten"
                  placeholder="Cari ID, faskes, kab/kota…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button aria-label="Hapus pencarian" onClick={() => setSearch('')}>
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="active-filter">
                <FilterIcon size={12} />
                <span>{filter === 'all' ? 'Semua status' : labels[filter]}</span>
                {onlyGeoAI && <small style={{ color: '#0284c7', fontWeight: 600 }}>[GeoAI Saja]</small>}
                <small>{filtered.length} episode</small>
              </div>
            </div>

            {/* Episode List Scroll Container */}
            <div className="case-list">
              {filtered.length ? (
                <>
                  {filtered.slice(0, pageSize).map((ep) => {
                    const c = categoryFromMaster(ep.cat);
                    const active = selected?.id === ep.id;

                    return (
                      <button
                        key={ep.id}
                        type="button"
                        className={`case-card ${active ? 'selected' : ''}`}
                        aria-pressed={active}
                        onClick={() => selectEpisode(ep.id)}
                      >
                        <div className="case-title">
                          <span className={`status-dot ${c}`} />
                          <strong>{ep.id}</strong>
                          {ep.hasGeoAI && (
                            <span
                              style={{
                                marginLeft: 'auto',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontSize: '8px',
                                fontWeight: 700,
                              }}
                            >
                              GeoAI
                            </span>
                          )}
                          <ChevronRight size={14} style={{ color: '#9bb0a4' }} />
                        </div>

                        <div className="case-route">
                          <span style={{ fontWeight: 600, color: '#274b3d' }}>{ep.fromName}</span>
                          <ArrowRight size={11} />
                          <span style={{ fontWeight: 600, color: '#274b3d' }}>{ep.toName}</span>
                        </div>

                        <p>
                          {ep.kabAsal} → {ep.kabTujuan} · {ep.visitCount} kunjungan
                        </p>

                        <div className="case-bottom">
                          <span>{dateLabel(ep.firstDate)}</span>
                          <span className={c === 'red' ? 'extra-red' : ''}>
                            {ep.diffMin != null && ep.diffMin > 0
                              ? `+${ep.diffMin.toFixed(1)} mnt selisih`
                              : `${formatMinutes(ep.timeMin)}`}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {filtered.length > pageSize && (
                    <button
                      type="button"
                      className="load-more"
                      onClick={() => setPageSize((p) => p + 50)}
                    >
                      Muat 50 episode berikutnya (tersisa {filtered.length - pageSize})…
                    </button>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <Search size={24} />
                  <strong>Tidak ada episode</strong>
                  <p>Ubah kata pencarian, status, kab/kota, atau periode rujukan.</p>
                </div>
              )}
            </div>

            {/* Quick summary note */}
            <div style={{ padding: '8px 12px', background: '#fafbf9', borderTop: '1px solid #e2e8dd', fontSize: '9px', color: '#788e80' }}>
              Klik episode untuk meninjau rute proksi, alternatif terdekat, dan bukti GeoAI.
            </div>
          </aside>

          {/* Center Column: Full NTT Map */}
          <section className="map-panel" aria-label="Peta Kepulauan NTT">
            <NTTMap
              data={data}
              episodes={periodEpisodes}
              selected={selected}
              activeGeoAIImage={activeGeoAIImage}
              showOverlay={showOverlay}
              setShowOverlay={setShowOverlay}
              overlayOpacity={overlayOpacity}
              setOverlayOpacity={setOverlayOpacity}
              showSatelliteBackdrop={showSatelliteBackdrop}
              setShowSatelliteBackdrop={setShowSatelliteBackdrop}
              focusRequest={focusRequest}
              onSelect={selectEpisode}
            />

            <div className="map-bottom">
              <div>
                <span className="eyebrow">CAKUPAN PROVINSI NUSA TENGGARA TIMUR</span>
                <p>
                  <strong>{filtered.length} episode tersaring</strong> · {data.summary.totals.episodes} episode total ·{' '}
                  {data.summary.totals.visits} kunjungan master
                </p>
              </div>
              <span className="map-count">879 Titik Faskes Referensi NTT</span>
            </div>
          </section>

          {/* Aside 2: Analysis & GeoAI Evidence Panel */}
          <aside className="analysis-panel" aria-label="Analisis dan Bukti GeoAI">
            <div className="panel-heading">
              <h2>
                <Sparkles size={16} /> Analisis Rujukan
              </h2>
              <span className="tiny-badge">NTT V2</span>
            </div>

            {/* Tab navigation: Summary | GeoAI Evidence | Agent Traces */}
            <div className="analysis-tabs" role="tablist">
              <button
                role="tab"
                id="tab-summary"
                aria-selected={tab === 'summary'}
                className={tab === 'summary' ? 'active' : ''}
                onClick={() => setTab('summary')}
              >
                Ringkasan
              </button>
              <button
                role="tab"
                id="tab-evidence"
                aria-selected={tab === 'evidence'}
                className={tab === 'evidence' ? 'active' : ''}
                onClick={() => setTab('evidence')}
              >
                Bukti GeoAI {selected?.hasGeoAI ? '●' : ''}
              </button>
              <button
                role="tab"
                id="tab-agents"
                aria-selected={tab === 'agents'}
                className={tab === 'agents' ? 'active' : ''}
                onClick={() => setTab('agents')}
              >
                Jejak Agen
              </button>
            </div>

            <div className="analysis-content">
              {tab === 'agents' ? (
                /* Tab Jejak Agen */
                <div role="tabpanel" id="panel-agents">
                  <div className="agent-header">
                    <BrandLogo className="agent-logo" size={52} />
                    <div>
                      <strong>Orchestrator SIGARA NTT</strong>
                      <p>6 agen spesialis · simulasi penelaahan rujukan</p>
                    </div>
                  </div>

                  <div className="agent-timeline">
                    {agents.map((agent, i) => {
                      const Icon = agent.icon;
                      const done = completed || (running && i < step);
                      const active = running && i === step;

                      return (
                        <div
                          className={`agent-step ${done ? 'done' : ''} ${active ? 'current' : ''}`}
                          key={agent.name}
                        >
                          <span className="agent-node">
                            {done ? (
                              <Check size={14} />
                            ) : active ? (
                              <LoaderCircle size={14} className="spin" />
                            ) : (
                              <Icon size={14} />
                            )}
                          </span>
                          <div>
                            <strong>{agent.name}</strong>
                            <p>{agent.action}</p>
                            <small>
                              {done ? 'Selesai dalam simulasi' : active ? 'Sedang disimulasikan…' : 'Tahap simulasi'}
                            </small>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {completed && (
                    <div className="simulation-result" aria-live="polite">
                      <CheckCircle2 size={17} />
                      <div>
                        <strong>{formatNumber(data.summary.totals.episodes)} episode NTT dirangkum</strong>
                        <p>
                          {formatNumber(data.summary.episodeCategories.TINGGI_SIM)} prioritas tinggi ·{' '}
                          {formatNumber(data.summary.episodeCategories.SEDANG_SIM)} prioritas sedang ·{' '}
                          {formatNumber(data.summary.episodeCategories.RENDAH_SIM)} prioritas rendah
                        </p>
                      </div>
                    </div>
                  )}

                  <p className="small-text">
                    Alur simulasi ini memperagakan kolaborasi agen penelaahan rujukan akuntabel.
                    Nilai dan prioritas dihitung berdasarkan dataset master sintetis tanpa rekayasa klaim di luar bukti.
                  </p>
                </div>
              ) : tab === 'evidence' ? (
                /* Tab Bukti GeoAI (Embeds GeoAIViewer) */
                <div role="tabpanel" id="panel-evidence">
                  <GeoAIViewer
                    episode={selected}
                    geoaiManifest={data.geoai}
                    activeImage={activeGeoAIImage}
                    setActiveImage={setActiveGeoAIImage}
                    showOverlay={showOverlay}
                    setShowOverlay={setShowOverlay}
                    overlayOpacity={overlayOpacity}
                    setOverlayOpacity={setOverlayOpacity}
                    showSatelliteBackdrop={showSatelliteBackdrop}
                    setShowSatelliteBackdrop={setShowSatelliteBackdrop}
                    onSelectEpisode={selectEpisode}
                  />
                </div>
              ) : selected ? (
                /* Tab Ringkasan */
                <div role="tabpanel" id="panel-summary">
                  <div className="selected-case-heading">
                    <span className={`status-pill ${selectedCat}`}>{labels[selectedCat]}</span>
                    <h3>
                      {selected.fromName} → {selected.toName}
                    </h3>
                    <span className="route-case-context">
                      Episode {selected.id} · {selected.visitCount} kunjungan master
                    </span>
                    <p>
                      {selected.kabAsal} <ArrowRight size={12} /> {selected.kabTujuan}
                    </p>
                  </div>

                  {/* Finding Box */}
                  <div className={`finding ${selectedCat}`}>
                    <span>Indikasi Penelaahan Rujukan</span>
                    <p>
                      {selectedCat === 'red'
                        ? `Episode ini tercatat dalam kategori prioritas penelaahan master (TINGGI_SIM). Jarak proksi ke tujuan adalah ${formatKm(selected.distM)} (${formatMinutes(selected.timeMin)}), menambah waktu sekitar ${formatMinutes(selected.diffMin)} dibandingkan fasilitas alternatif layak terdekat.`
                        : selectedCat === 'orange'
                        ? `Episode rujukan dalam kategori penelaahan sedang (SEDANG_SIM). Terdapat data pendukung atau kapasitas yang memerlukan verifikasi berkala.`
                        : `Episode rujukan dalam kategori penelaahan rendah (RENDAH_SIM). Pemilihan tujuan dinilai sesuai dengan proksi akses terdekat atau memiliki alasan kesinambungan perawatan.`}
                    </p>
                  </div>

                  {/* Key Variables */}
                  <div className="key-variables">
                    <div>
                      <span>Waktu ke tujuan</span>
                      <strong>{formatMinutes(selected.timeMin)}</strong>
                    </div>
                    <div>
                      <span>Alternatif layak</span>
                      <strong>
                        {selected.altOutside ? (
                          <span style={{ fontSize: '11px', color: '#b45309' }}>Di luar NTT (NTB)</span>
                        ) : (
                          formatMinutes(selected.altTimeMin)
                        )}
                      </strong>
                    </div>
                    <div>
                      <span>Selisih waktu</span>
                      <strong className={selected.diffMin != null && selected.diffMin > 0 ? 'extra-red' : ''}>
                        {formatMinutes(selected.diffMin)}
                      </strong>
                    </div>
                    <div>
                      <span>Rasio waktu</span>
                      <strong>
                        {selected.timeRatio != null ? `${selected.timeRatio.toFixed(2)}×` : '—'}
                      </strong>
                    </div>
                  </div>

                  {/* Nearest Alternative Detail */}
                  <div className="alternatives-title">
                    <h4>Alternatif Terdekat Layak</h4>
                    <span>{selected.nCloser ? `${selected.nCloser} lebih dekat` : 'Kandidat faskes'}</span>
                  </div>

                  {selected.altId ? (
                    <div className="alternative-row">
                      <span className="alternative-number">1</span>
                      <div>
                        <strong>{selected.altName || selected.altId}</strong>
                        <span>
                          {selected.altOutside
                            ? '⚠️ Terletak di luar cakupan provinsi NTT (Provinsi NTB)'
                            : 'Fasilitas rujukan alternatif dalam cakupan NTT'}
                        </span>
                      </div>
                      <b>{selected.altOutside ? 'Luar NTT' : formatMinutes(selected.altTimeMin)}</b>
                    </div>
                  ) : (
                    <p className="small-text">Tidak ada data faskes alternatif lebih dekat yang tercatat.</p>
                  )}

                  {/* Evidence summary preview item */}
                  <div style={{ marginTop: '14px', borderTop: '1px solid #e4e9e3', paddingTop: '12px' }}>
                    <div className="evidence-item" style={{ borderBottom: 'none', padding: '6px 0' }}>
                      <Sparkles size={16} style={{ color: selected.hasGeoAI ? '#0284c7' : '#9ca3af' }} />
                      <div>
                        <span>Bukti Penginderaan Jauh</span>
                        <strong>
                          {selected.hasGeoAI ? 'Tersedia Ilustrasi GeoAI (2 Skenario)' : 'Belum ada bukti GeoAI'}
                        </strong>
                        <p>
                          {selected.hasGeoAI
                            ? 'Buka tab "Bukti GeoAI" untuk memeriksa kandidat bencana dan overlay raster di peta.'
                            : 'Paket ilustrasi POC v2 berfokus pada 8 episode percontohan di NTT.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* View Full Case Details Modal Button */}
                  <button className="detail-button" onClick={() => setDetailModalOpen(true)}>
                    Buka Rincian Kasus &amp; {selected.visitCount} Kunjungan
                    <ArrowUpRight size={15} />
                  </button>

                  <p className="analysis-disclaimer">
                    Prioritas penelaahan simulasi · Bukan penetapan kecurangan (fraud)
                  </p>
                </div>
              ) : (
                <div className="empty-state">
                  <FileText size={25} />
                  <strong>Pilih episode pada daftar</strong>
                  <p>Hasil penelaahan, alternatif, dan bukti GeoAI akan tampil di sini.</p>
                </div>
              )}
            </div>
          </aside>
        </section>

        {/* Footer */}
        <footer className="app-footer">
          <span>
            <BrandLogo className="footer-logo" size={26} decorative />
            <span className="status-dot green" />
            {source === 'neon' ? 'Sumber data: Neon' : 'Sumber data: Snapshot NTT'}
            <span className="footer-separator">/</span>
            {data.summary.version}
          </span>
          <span>Data simulasi · Cakupan Kepulauan NTT (21 Kab/Kota) · 16 Aset GeoAI v2</span>
        </footer>
      </main>

      {/* Case Details & About Modal */}
      {detailModalOpen && (
        <CaseDetails
          data={data}
          referral={selected}
          onSelectCase={selectEpisode}
          onClose={() => setDetailModalOpen(false)}
        />
      )}
    </div>
  );
}
