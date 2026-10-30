'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight, ChevronLeft, ChevronRight, ListFilter, MapPin, Search, SlidersHorizontal, Sparkles, X, Info, HelpCircle } from 'lucide-react';
import AppHeader from './AppHeader';
import { loadShowcase } from '@/lib/load-showcase';
import { districtLabel, episodeCounts, filterMapEpisodes, investigationHref, readCamera, readMapFilters, type Camera } from '@/lib/map-overview';
import { categoryFromMaster, dateLabel, formatFacilityName, formatNumber, monthLabel, type Filter, type ShowcaseData } from '@/lib/showcase';
import SigaraIndexCard from './index/SigaraIndexCard';
import IndexDataFlow from './index/IndexDataFlow';
import { buildEpisodeExplanation } from '@/lib/sigara-index';

const OverviewMap = dynamic(() => import('./OverviewMap'), { ssr: false, loading: () => <div className="overview-map map-loading">Menyiapkan peta NTT…</div> });
const categoryNames: Record<Filter, string> = { all: 'Semua', red: 'Tinggi', orange: 'Sedang', green: 'Rendah' };
const PAGE_SIZE = 8;

export default function MapOverview() {
  const router = useRouter();
  const params = useSearchParams();
  const filters = useMemo(() => readMapFilters(new URLSearchParams(params)), [params]);
  const initialCamera = useRef(readCamera(new URLSearchParams(params)));
  const [data, setData] = useState<ShowcaseData | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [advanced, setAdvanced] = useState(false);
  const [about, setAbout] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(params.get('ep') || null);
  const [query, setQuery] = useState(filters.query);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const listOpen = params.get('list') !== '0';
  const showFacilities = params.get('refs') === '1';

  useEffect(() => {
    let alive = true; setError(false);
    loadShowcase().then(snapshot => { if (alive) setData(snapshot); }).catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [retry]);
  useEffect(() => { setQuery(filters.query); }, [filters.query]);

  function update(values: Record<string, string | null>, resetPage = true) {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(values)) { if (value === null || value === '') next.delete(key); else next.set(key, value); }
    if (resetPage) next.delete('page');
    // Synchronous URL state prevents a pending filter navigation from overwriting
    // a camera update (or a second filter) triggered in the same interaction.
    window.history.replaceState(null, '', `/${next.size ? '?' + next.toString() : ''}`);
  }
  function saveCamera(camera: Camera) {
    const next = new URLSearchParams(window.location.search);
    next.set('lng', camera.lng.toFixed(5)); next.set('lat', camera.lat.toFixed(5)); next.set('z', camera.zoom.toFixed(3));
    window.history.replaceState(null, '', `/?${next.toString()}`);
  }

  const scoped = useMemo(() => data ? filterMapEpisodes(data.episodes, filters, false) : [], [data, filters.query, filters.district, filters.month, filters.geoai]);
  const counts = useMemo(() => episodeCounts(scoped), [scoped]);
  const filtered = useMemo(() => filters.category === 'all' ? scoped : scoped.filter(ep => categoryFromMaster(ep.cat) === filters.category), [scoped, filters.category]);
  const listed = useMemo(() => {
    const ranks = { TINGGI_SIM: 0, SEDANG_SIM: 1, RENDAH_SIM: 2 };
    return filtered
      .filter(ep => (!filters.origin || ep.fromId === filters.origin) && (!filters.line || `${ep.fromId}__${ep.toId}` === filters.line))
      .sort((a, b) => ranks[a.cat] - ranks[b.cat] || (b.diffMin ?? -Infinity) - (a.diffMin ?? -Infinity) || a.id.localeCompare(b.id));
  }, [filtered, filters.origin, filters.line]);
  const totalPages = Math.max(1, Math.ceil(listed.length / PAGE_SIZE));
  const rawPage = Number(params.get('page') || 1);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.min(totalPages, Math.floor(rawPage))) : 1;
  const pageItems = listed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const originName = data?.episodes.find(ep => ep.fromId === filters.origin)?.fromName;
  const narrowed = filters.query || filters.district !== 'all' || filters.month !== 'all' || filters.geoai || filters.category !== 'all' || filters.origin || filters.line;

  // Selected episode object for the compact card preview
  const selectedEpisode = useMemo(() => {
    if (!selectedEpisodeId || !data) return null;
    return data.episodes.find(e => e.id === selectedEpisodeId) || null;
  }, [selectedEpisodeId, data]);

  const selectedExplanation = useMemo(() => {
    if (!selectedEpisode) return null;
    return buildEpisodeExplanation(selectedEpisode, 'master', data?.geoai);
  }, [selectedEpisode, data?.geoai]);

  function selectOrigin(origin: string) {
    const matches = filtered.filter(ep => ep.fromId === origin);
    if (!matches.length) return;
    // Keep user on the map even if 1 episode; focus camera and show journey line
    update({ origin, list: '1', line: null });
    requestAnimationFrame(() => listHeading.current?.focus({ preventScroll: true }));
  }

  return <div className="map-home">
    <a className="overview-skip" href="#overview-results">Lewati peta, buka daftar episode</a>
    <AppHeader onOpenAbout={() => setAbout(v => !v)} />
    <main className="overview-main">
      <section className="overview-heading">
        <div><h1>Peta rujukan Nusa Tenggara Timur</h1><p>Pilih titik atau episode untuk menelaah indikasi dan buktinya.</p></div>
        <div className="overview-scope"><span className="overview-sim-dot" />Data simulasi · 2024{data && <small>{formatNumber(data.episodes.length)} episode rujukan</small>}</div>
      </section>
      {about && <section className="overview-notice" aria-label="Tentang penelaahan"><Info size={19} /><p>SIGARA membantu petugas menelaah rujukan. Kategori adalah indikasi simulasi pada episode; penetapan dan tindak lanjut tetap oleh petugas. Ilustrasi GeoAI menggunakan skenario sintetis. Rincian metode dan sumber tersedia pada setiap halaman episode.</p><button onClick={() => setAbout(false)} aria-label="Tutup informasi"><X size={18} /></button></section>}
      <section className="overview-toolbar" aria-label="Filter peta dan episode">
        <div className="overview-search-row">
          <form className="overview-search" onSubmit={e => { e.preventDefault(); update({ q: query.trim(), origin: null, line: null, list: '1' }); }}>
            <Search size={18} aria-hidden="true" /><input aria-label="Cari ID episode atau fasilitas" placeholder="Cari ID episode atau nama fasilitas…" value={query} onChange={e => setQuery(e.target.value)} />
            {query && <button type="button" aria-label="Hapus pencarian" onClick={() => { setQuery(''); update({ q: null, origin: null, line: null }); }}><X size={16} /></button>}
            <button type="submit" className="overview-search-submit">Cari</button>
          </form>
          <label className="overview-district"><MapPin size={17} /><span className="sr-only">Kabupaten atau kota asal</span><select aria-label="Kabupaten atau kota asal" value={filters.district} onChange={e => update({ district: e.target.value === 'all' ? null : e.target.value, origin: null, line: null })}>
            <option value="all">Seluruh NTT · kabupaten asal</option>{data?.summary.districts.map(d => <option key={d} value={d}>{districtLabel(d)}</option>)}
          </select></label>
          <button className={`overview-tool-button ${advanced ? 'active' : ''}`} aria-expanded={advanced} aria-controls="overview-advanced" onClick={() => setAdvanced(v => !v)}><SlidersHorizontal size={17} />Filter lainnya{(filters.month !== 'all' || filters.geoai || showFacilities) && <span className="overview-filter-dot" />}</button>
        </div>

        {/* Clear Group Header with Method link */}
        <div className="overview-category-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span className="overview-category-title" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', color: '#315542', textTransform: 'uppercase' }}>
                SIGARA Index — Prioritas Penelaahan Rujukan
              </span>
              <button
                type="button"
                onClick={() => setMethodologyOpen(v => !v)}
                style={{ background: 'none', border: 'none', color: '#256c4e', textDecoration: 'underline', fontSize: '11px', fontWeight: 600, padding: 0, textAlign: 'left', cursor: 'pointer' }}
              >
                Bagaimana indeks dibentuk?
              </button>
            </div>
            <div className="overview-category-options" aria-label="Kategori indikasi simulasi">
              {(['all', 'red', 'orange', 'green'] as Filter[]).map(cat => <button key={cat} className={`overview-category ${cat} ${filters.category === cat ? 'active' : ''}`} aria-pressed={filters.category === cat} onClick={() => update({ cat: cat === 'all' ? null : cat, origin: null, line: null })}>
                {cat !== 'all' && <span className={`overview-category-dot ${cat}`} />}<span>{categoryNames[cat]}</span><strong>{data ? formatNumber(counts[cat]) : '—'}</strong>
              </button>)}
            </div>
          </div>
          <button className="overview-list-toggle" aria-expanded={listOpen} aria-controls="overview-results" onClick={() => update({ list: listOpen ? '0' : '1' }, false)}><ListFilter size={17} />{listOpen ? 'Tutup daftar' : 'Buka daftar episode'}</button>
        </div>
        {advanced && <div id="overview-advanced" className="overview-advanced">
          <label>Periode rujukan<select value={filters.month} onChange={e => update({ month: e.target.value === 'all' ? null : e.target.value, origin: null, line: null })}><option value="all">Semua bulan · 2024</option>{data?.summary.months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></label>
          <label className="overview-check"><input type="checkbox" checked={filters.geoai} onChange={e => update({ geoai: e.target.checked ? '1' : null, origin: null, line: null, list: '1' })} />Hanya episode dengan ilustrasi GeoAI ({data?.summary.totals.geoaiEpisodes ?? '—'})</label>
          <label className="overview-check"><input type="checkbox" checked={showFacilities} onChange={e => update({ refs: e.target.checked ? '1' : null }, false)} />Titik referensi faskes ({data?.summary.totals.facilitiesReference ?? '—'})</label>
        </div>}
      </section>
      <div className="overview-result-bar" aria-live="polite"><span>{data ? <><strong>{formatNumber(filtered.length)}</strong> episode{filters.category !== 'all' ? ` · indikasi ${categoryNames[filters.category].toLowerCase()}` : ''}{filters.district !== 'all' ? ` · asal ${districtLabel(filters.district)}` : ' di seluruh NTT'}{filters.month !== 'all' ? ` · ${monthLabel(filters.month)}` : ''}{filters.geoai ? ' · ilustrasi GeoAI tersedia' : ''}{filters.query ? ` · “${filters.query}”` : ''}</> : 'Memuat data NTT…'}</span>{narrowed && <button onClick={() => { setQuery(''); setSelectedEpisodeId(null); update({ cat: null, q: null, district: null, month: null, geoai: null, origin: null, line: null }); }}>Reset filter</button>}</div>
      {error ? <div className="overview-error" role="alert"><h2>Data belum dapat dimuat</h2><p>Periksa koneksi, lalu coba lagi.</p><button onClick={() => setRetry(v => v + 1)}>Coba lagi</button></div> : <div className={`overview-workspace ${listOpen ? 'with-list' : ''}`}>
        {data ? <OverviewMap data={data} episodes={filtered} initialCamera={initialCamera.current} district={filters.district} selectedOrigin={filters.origin} selectedLine={filters.line || null} showFacilities={showFacilities} listOpen={listOpen} onOrigin={selectOrigin} onSelectLine={(lineId) => {
          update({ line: lineId }, false);
          // If this line has exactly 1 episode, preselect that episode
          if (lineId) {
            const matches = filtered.filter(ep => `${ep.fromId}__${ep.toId}` === lineId);
            if (matches.length === 1) {
              setSelectedEpisodeId(matches[0].id);
            }
          }
        }} onCamera={saveCamera} onResetView={() => { setSelectedEpisodeId(null); update({ origin: null, line: null }, false); }} /> : <div className="overview-map map-loading">Memuat peta kepulauan NTT…</div>}
        <aside id="overview-results" className={`overview-results ${listOpen ? '' : 'is-collapsed'}`} aria-label="Episode rujukan sesuai filter">
          {listOpen ? <>
            {/* If an episode is selected, show its compact index card at the top */}
            {selectedExplanation && selectedEpisode ? (
              <div style={{ padding: '14px', borderBottom: '1px solid #e2ece5', background: '#f8faf8' }}>
                <SigaraIndexCard
                  compact
                  explanation={selectedExplanation}
                  investigationHref={investigationHref(selectedEpisode.id, new URLSearchParams(params))}
                  onClose={() => setSelectedEpisodeId(null)}
                />
              </div>
            ) : null}

            <div className="overview-list-heading">
              <div>
                <h2 ref={listHeading} tabIndex={-1}>
                  {filters.line
                    ? 'Episode rute rujukan ini'
                    : filters.origin
                    ? 'Episode dari fasilitas ini'
                    : 'Episode untuk ditelaah'}
                </h2>
                <p>
                  {filters.line
                    ? `${formatNumber(listed.length)} episode rujukan pada rute terpilih`
                    : filters.origin
                    ? formatFacilityName(originName, 'asal')
                    : 'Indikasi tinggi lebih dahulu, lalu selisih waktu proksi.'}
                </p>
              </div>
              <button onClick={() => update({ list: '0' }, false)} aria-label="Tutup daftar episode"><X size={18} /></button>
            </div>
            {filters.line ? (
              <div className="overview-origin-filter">
                <span>Rute terpilih: {listed[0]?.fromName} → {listed[0]?.toName} ({formatNumber(listed.length)} episode)</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <button onClick={() => update({ line: null })}>Lihat semua rute faskes ini</button>
                  <button onClick={() => update({ origin: null, line: null })}>Lihat semua titik NTT</button>
                </div>
              </div>
            ) : filters.origin ? (
              <div className="overview-origin-filter">
                <span>{formatNumber(listed.length)} episode dari fasilitas asal ini</span>
                <button onClick={() => update({ origin: null })}>Lihat semua titik</button>
              </div>
            ) : null}
            <div className="overview-cases">
              {pageItems.map(ep => {
                const cat = categoryFromMaster(ep.cat);
                const epLine = `${ep.fromId}__${ep.toId}`;
                const isLineActive = filters.line === epLine;
                const isEpSelected = selectedEpisodeId === ep.id;
                return <Link
                  key={ep.id}
                  prefetch={false}
                  href={investigationHref(ep.id, new URLSearchParams(params))}
                  className={`overview-case ${isLineActive ? 'is-line-active' : ''} ${isEpSelected ? 'is-selected-ep' : ''}`}
                  style={isEpSelected ? { background: '#ebf4ef', outline: '2px solid #238673' } : undefined}
                >
                  <div className="overview-case-meta">
                    <span className={`overview-status ${cat}`}><i />{categoryNames[cat]}</span>
                    <span>{districtLabel(ep.kabAsal)}</span>
                    {ep.hasGeoAI && <Sparkles size={14} aria-label="Ilustrasi GeoAI tersedia" />}
                  </div>
                  <h3>{formatFacilityName(ep.fromName, 'asal')}</h3>
                  <p className="overview-case-destination"><ArrowRight size={13} />{formatFacilityName(ep.toName, 'tujuan')}</p>
                  <div className="overview-case-bottom">
                    <span>{dateLabel(ep.firstDate)} · {ep.visitCount} kunjungan</span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedEpisodeId(ep.id === selectedEpisodeId ? null : ep.id);
                        }}
                        style={{ background: '#e3ece6', border: 'none', color: '#1f533e', fontSize: '10px', fontWeight: 700, padding: '3px 7px', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        {selectedEpisodeId === ep.id ? 'Tutup Indeks' : 'Pratinjau Indeks'}
                      </button>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                  <code>{ep.id}</code>
                </Link>;
              })}
              {data && !listed.length && <div className="overview-empty"><Search size={25} /><h3>Tidak ada episode yang sesuai</h3><p>Ubah kategori atau wilayah, atau hapus filter untuk menjelajahi lagi.</p><button onClick={() => { setQuery(''); update({ cat: null, q: null, district: null, month: null, geoai: null, origin: null, line: null }); }}>Hapus filter</button></div>}
              {!data && <p className="overview-empty">Menyiapkan daftar episode…</p>}
            </div>
            <div className="overview-pagination"><span>{formatNumber(listed.length)} episode · {page}/{totalPages}</span><button aria-label="Episode sebelumnya" disabled={page === 1} onClick={() => update({ page: String(page - 1) }, false)}><ChevronLeft size={18} /></button><button aria-label="Episode berikutnya" disabled={page === totalPages} onClick={() => update({ page: String(page + 1) }, false)}><ChevronRight size={18} /></button></div>
          </> : <button className="overview-sr-list" onClick={() => update({ list: '1' }, false)}>Buka daftar episode</button>}
        </aside>
      </div>}

      {/* Global Methodology Section (Disclosure below map workspace) */}
      <details
        className="global-methodology-disclosure"
        open={methodologyOpen}
        onToggle={(e) => setMethodologyOpen(e.currentTarget.open)}
      >
        <summary className="global-methodology-summary">
          <div className="summary-left">
            <Sparkles size={16} color="#258471" />
            <span>Aliran Data SIGARA Index — Transparansi Delapan Sumber</span>
          </div>
          <span className="toggle-badge">
            {methodologyOpen ? 'Sembunyikan Diagram Metodologi' : 'Buka Diagram Delapan Sumber & Empat Pilar'}
          </span>
        </summary>
        <div className="global-methodology-body">
          <IndexDataFlow
            mode="structure"
            globalTitle="Aliran Data SIGARA Index — Struktur Model Delapan Sumber"
          />
        </div>
      </details>

      <footer className="overview-footer"><span><Info size={14} />Indikasi pada episode, bukan penetapan fraud pada faskes.</span><Link href="/contoh-geoai"><Sparkles size={14} />Jelajahi contoh GeoAI<ArrowRight size={14} /></Link></footer>
    </main>
  </div>;
}
