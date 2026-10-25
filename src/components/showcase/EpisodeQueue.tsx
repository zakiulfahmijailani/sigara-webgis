'use client';
import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter as FilterIcon,
  X,
  ChevronRight,
  ArrowRight,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  Calendar,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Layers3,
} from 'lucide-react';
import type {
  ShowcaseData,
  Category,
  Filter,
  Episode,
} from '@/lib/showcase';
import {
  categoryFromMaster,
  labels,
  colors,
  formatNumber,
  formatMinutes,
  formatFacilityName,
  dateLabel,
  monthLabel,
  getReasonLabel,
} from '@/lib/showcase';
import AppHeader from './AppHeader';
import BrandLogo from './BrandLogo';
import CaseDetails from './CaseDetails';

type Props = {
  data: ShowcaseData;
};

export default function EpisodeQueue({ data }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL query params
  const paramCat = searchParams.get('cat') as Filter | null;
  const paramQ = searchParams.get('q') || '';
  const paramDistrict = searchParams.get('district') || 'all';
  const paramMonth = searchParams.get('month') || 'all';
  const paramGeoAI = searchParams.get('geoai') === '1';
  const paramPage = parseInt(searchParams.get('page') || '1', 10);

  // Filter states
  const [filter, setFilter] = useState<Filter>(paramCat || 'red');
  const [search, setSearch] = useState<string>(paramQ);
  const [district, setDistrict] = useState<string>(paramDistrict);
  const [month, setMonth] = useState<string>(paramMonth);
  const [onlyGeoAI, setOnlyGeoAI] = useState<boolean>(paramGeoAI);
  const [currentPage, setCurrentPage] = useState<number>(isNaN(paramPage) ? 1 : paramPage);

  // Advanced filter drawer open state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const pageSize = 30;

  // Sync state changes to URL
  const updateUrl = (
    newFilter: Filter,
    newSearch: string,
    newDistrict: string,
    newMonth: string,
    newGeoAI: boolean,
    newPage: number
  ) => {
    const params = new URLSearchParams();
    if (newFilter !== 'all') params.set('cat', newFilter);
    if (newSearch) params.set('q', newSearch);
    if (newDistrict !== 'all') params.set('district', newDistrict);
    if (newMonth !== 'all') params.set('month', newMonth);
    if (newGeoAI) params.set('geoai', '1');
    if (newPage > 1) params.set('page', String(newPage));
    router.replace(`/episode?${params.toString()}`);
  };

  // Base counts across entire dataset
  const baseCounts = useMemo(() => {
    const counts = { red: 0, orange: 0, green: 0, all: data.episodes.length };
    for (const ep of data.episodes) {
      const c = categoryFromMaster(ep.cat);
      counts[c]++;
    }
    return counts;
  }, [data.episodes]);

  // Filtering pipeline
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return data.episodes.filter((ep) => {
      const c = categoryFromMaster(ep.cat);
      const matchCat = filter === 'all' || c === filter;
      const matchDistrict = district === 'all' || ep.kabAsal === district || ep.kabTujuan === district;
      const matchMonth = month === 'all' || ep.month === month;
      const matchGeoAI = !onlyGeoAI || ep.hasGeoAI;
      const matchSearch =
        !term ||
        ep.id.toLowerCase().includes(term) ||
        ep.fromName.toLowerCase().includes(term) ||
        ep.toName.toLowerCase().includes(term) ||
        ep.kabAsal.toLowerCase().includes(term) ||
        ep.kabTujuan.toLowerCase().includes(term);

      return matchCat && matchDistrict && matchMonth && matchGeoAI && matchSearch;
    });
  }, [data.episodes, filter, district, month, onlyGeoAI, search]);

  // Ordering: ground in source priority (diffMin desc, then id)
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const diffA = a.diffMin ?? -1;
      const diffB = b.diffMin ?? -1;
      if (diffB !== diffA) return diffB - diffA;
      return a.id.localeCompare(b.id);
    });
  }, [filtered]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  // Handlers
  const handleCategoryChange = (newCat: Filter) => {
    setFilter(newCat);
    setCurrentPage(1);
    updateUrl(newCat, search, district, month, onlyGeoAI, 1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
    updateUrl(filter, val, district, month, onlyGeoAI, 1);
  };

  const handleDistrictChange = (val: string) => {
    setDistrict(val);
    setCurrentPage(1);
    updateUrl(filter, search, val, month, onlyGeoAI, 1);
  };

  const handleMonthChange = (val: string) => {
    setMonth(val);
    setCurrentPage(1);
    updateUrl(filter, search, district, val, onlyGeoAI, 1);
  };

  const handleGeoAIToggle = () => {
    const next = !onlyGeoAI;
    setOnlyGeoAI(next);
    setCurrentPage(1);
    updateUrl(filter, search, district, month, next, 1);
  };

  const resetAllFilters = () => {
    setFilter('red');
    setSearch('');
    setDistrict('all');
    setMonth('all');
    setOnlyGeoAI(false);
    setCurrentPage(1);
    updateUrl('red', '', 'all', 'all', false, 1);
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Active filter chips
  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (filter !== 'all') {
    activeChips.push({
      label: `Kategori: ${labels[filter]}`,
      onRemove: () => handleCategoryChange('all'),
    });
  }
  if (search) {
    activeChips.push({
      label: `Pencarian: "${search}"`,
      onRemove: () => handleSearchChange(''),
    });
  }
  if (district !== 'all') {
    activeChips.push({
      label: `Kab/Kota: ${district}`,
      onRemove: () => handleDistrictChange('all'),
    });
  }
  if (month !== 'all') {
    activeChips.push({
      label: `Periode: ${monthLabel(month)}`,
      onRemove: () => handleMonthChange('all'),
    });
  }
  if (onlyGeoAI) {
    activeChips.push({
      label: 'Hanya bukti GeoAI (8 episode)',
      onRemove: handleGeoAIToggle,
    });
  }

  // Preserve queue URL params when navigating to episode
  const currentQueryString = searchParams.toString();

  return (
    <div className="queue-container">
      <AppHeader onOpenAbout={() => setAboutOpen(true)} />

      <main className="queue-main">
        {/* Page title and breadcrumb */}
        <section className="queue-header-section">
          <div>
            <div className="queue-breadcrumb">
              <Link href="/">Beranda</Link>
              <ChevronRight size={13} />
              <span>Daftar Episode Rujukan</span>
            </div>
            <h1 className="queue-title">Antrean Penelaahan Episode</h1>
            <p className="queue-subtitle">
              Pilih episode rujukan untuk memeriksa rincian OD, perbandingan alternatif fasilitas layak terdekat, dan bukti penginderaan jauh.
            </p>
          </div>

          <div className="queue-summary-box">
            <span className="queue-summary-title">Cakupan Wilayah NTT</span>
            <strong className="queue-summary-count">{formatNumber(data.summary.totals.episodes)} episode</strong>
            <span className="queue-summary-sub">
              {formatNumber(data.summary.totals.visits)} kunjungan · {data.summary.totals.facilitiesReference} faskes
            </span>
          </div>
        </section>

        {/* Primary Category Selector Cards */}
        <section className="queue-category-cards" aria-label="Pilihan Kategori Prioritas">
          <button
            type="button"
            className={`queue-cat-card red ${filter === 'red' ? 'selected' : ''}`}
            onClick={() => handleCategoryChange('red')}
          >
            <div className="queue-cat-top">
              <span className="queue-cat-badge red">
                <AlertTriangle size={15} />
                Prioritas Tinggi
              </span>
              <strong className="queue-cat-number">{formatNumber(baseCounts.red)}</strong>
            </div>
            <p className="queue-cat-desc">
              Melebihi proksi alternatif terdekat secara signifikan (+selisih waktu tempuh).
            </p>
          </button>

          <button
            type="button"
            className={`queue-cat-card orange ${filter === 'orange' ? 'selected' : ''}`}
            onClick={() => handleCategoryChange('orange')}
          >
            <div className="queue-cat-top">
              <span className="queue-cat-badge orange">
                <ShieldCheck size={15} />
                Prioritas Sedang
              </span>
              <strong className="queue-cat-number">{formatNumber(baseCounts.orange)}</strong>
            </div>
            <p className="queue-cat-desc">
              Terdapat data kapasitas atau alasan kesinambungan yang memerlukan verifikasi.
            </p>
          </button>

          <button
            type="button"
            className={`queue-cat-card green ${filter === 'green' ? 'selected' : ''}`}
            onClick={() => handleCategoryChange('green')}
          >
            <div className="queue-cat-top">
              <span className="queue-cat-badge green">
                <CheckCircle2 size={15} />
                Prioritas Rendah
              </span>
              <strong className="queue-cat-number">{formatNumber(baseCounts.green)}</strong>
            </div>
            <p className="queue-cat-desc">
              Sesuai dengan fasilitas rujukan terdekat atau kesinambungan perawatan standar.
            </p>
          </button>

          <button
            type="button"
            className={`queue-cat-card all ${filter === 'all' ? 'selected' : ''}`}
            onClick={() => handleCategoryChange('all')}
          >
            <div className="queue-cat-top">
              <span className="queue-cat-badge neutral">
                <Layers3 size={15} />
                Semua Kategori
              </span>
              <strong className="queue-cat-number">{formatNumber(baseCounts.all)}</strong>
            </div>
            <p className="queue-cat-desc">
              Seluruh master rujukan NTT tanpa penyaringan kategori.
            </p>
          </button>
        </section>

        {/* Toolbar: Search & Filter Drawer Trigger */}
        <section className="queue-toolbar" aria-label="Penyaringan antrean">
          <div className="queue-search-wrap">
            <Search size={18} className="queue-search-icon" />
            <input
              type="text"
              className="queue-search-input"
              placeholder="Cari ID episode, nama faskes asal/tujuan, kabupaten..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Pencarian episode"
            />
            {search && (
              <button
                type="button"
                className="queue-search-clear"
                onClick={() => handleSearchChange('')}
                aria-label="Hapus kata kunci pencarian"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="queue-toolbar-actions">
            <button
              type="button"
              className={`queue-adv-btn ${showAdvancedFilters ? 'active' : ''}`}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              aria-expanded={showAdvancedFilters}
            >
              <SlidersHorizontal size={15} />
              <span>Filter Lainnya</span>
              {(district !== 'all' || month !== 'all' || onlyGeoAI) && (
                <span className="filter-active-dot" />
              )}
            </button>

            <button
              type="button"
              className={`queue-geoai-btn ${onlyGeoAI ? 'active' : ''}`}
              onClick={handleGeoAIToggle}
            >
              <Sparkles size={14} />
              <span>{onlyGeoAI ? 'Semua Kasus' : 'Hanya Ilustrasi GeoAI (8)'}</span>
            </button>
          </div>
        </section>

        {/* Collapsible Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <section className="queue-advanced-drawer" aria-label="Filter tambahan">
            <div className="adv-filter-grid">
              <div className="adv-filter-item">
                <label htmlFor="adv-district">
                  <MapPin size={13} />
                  <span>Kabupaten / Kota</span>
                </label>
                <div className="select-wrap">
                  <select
                    id="adv-district"
                    value={district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                  >
                    <option value="all">Seluruh NTT (wilayah asal)</option>
                    {data.summary.districts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>
              </div>

              <div className="adv-filter-item">
                <label htmlFor="adv-month">
                  <Calendar size={13} />
                  <span>Periode Bulan Rujukan</span>
                </label>
                <div className="select-wrap">
                  <select
                    id="adv-month"
                    value={month}
                    onChange={(e) => handleMonthChange(e.target.value)}
                  >
                    <option value="all">Semua Bulan (Tahun 2024)</option>
                    {data.summary.months.map((m) => (
                      <option key={m} value={m}>
                        {monthLabel(m)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="select-arrow" />
                </div>
              </div>
            </div>

            <div className="adv-drawer-footer">
              <button
                type="button"
                className="adv-reset-btn"
                onClick={resetAllFilters}
              >
                <RotateCcw size={13} />
                <span>Reset Semua Filter</span>
              </button>
              <button
                type="button"
                className="adv-close-btn"
                onClick={() => setShowAdvancedFilters(false)}
              >
                Tutup Filter
              </button>
            </div>
          </section>
        )}

        {/* Applied Filter Chips & Count Bar */}
        <section className="queue-meta-bar">
          <div className="queue-count-info">
            <strong>{formatNumber(sorted.length)}</strong>
            <span>episode ditemukan</span>
            {sorted.length !== data.episodes.length && (
              <span className="queue-scope">dari {formatNumber(data.episodes.length)} total</span>
            )}
          </div>

          {activeChips.length > 0 && (
            <div className="queue-chips-wrap">
              {activeChips.map((chip, idx) => (
                <span key={idx} className="filter-chip">
                  <span>{chip.label}</span>
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={`Hapus ${chip.label}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                className="clear-all-chips"
                onClick={resetAllFilters}
              >
                Reset Filter
              </button>
            </div>
          )}
        </section>

        {/* Results List */}
        <section className="queue-list-section" aria-label="Hasil episode rujukan">
          {pageItems.length > 0 ? (
            <div className="queue-card-list">
              {pageItems.map((ep) => {
                const c = categoryFromMaster(ep.cat);
                const readableFrom = formatFacilityName(ep.fromName, 'asal');
                const readableTo = formatFacilityName(ep.toName, 'tujuan');
                const investigationUrl = `/episode/${ep.id}${currentQueryString ? `?${currentQueryString}` : ''}`;

                return (
                  <article
                    key={ep.id}
                    className={`queue-episode-card ${c}`}
                  >
                    {/* Header: Indication Badge, Date, GeoAI Flag */}
                    <div className="q-card-header">
                      <div className="q-card-badges">
                        <span className={`q-status-badge ${c}`}>
                          <span className={`q-status-dot ${c}`} />
                          {labels[c]}
                        </span>
                        {ep.hasGeoAI && (
                          <span className="q-geoai-badge">
                            <Sparkles size={12} />
                            Ilustrasi GeoAI tersedia
                          </span>
                        )}
                      </div>

                      <div className="q-card-date">
                        <span>{dateLabel(ep.firstDate)}</span>
                        <span className="q-visit-count">
                          {ep.visitCount} kunjungan
                        </span>
                      </div>
                    </div>

                    {/* Main Route Info: Origin -> Destination */}
                    <div className="q-card-route">
                      <div className="q-route-item origin">
                        <span className="q-route-role">Faskes Asal (FKTP)</span>
                        <strong className="q-facility-name">{readableFrom}</strong>
                        <span className="q-facility-loc">{ep.kabAsal}</span>
                      </div>

                      <div className="q-route-arrow" aria-hidden="true">
                        <ArrowRight size={18} />
                      </div>

                      <div className="q-route-item destination">
                        <span className="q-route-role">Faskes Tujuan (FKRTL)</span>
                        <strong className="q-facility-name">{readableTo}</strong>
                        <span className="q-facility-loc">{ep.kabTujuan}</span>
                      </div>
                    </div>

                    {/* Metrics & Reason */}
                    <div className="q-card-metrics">
                      <div className="q-metric-item">
                        <span className="q-metric-label">Waktu tempuh proksi:</span>
                        <strong className="q-metric-val">{formatMinutes(ep.timeMin)}</strong>
                      </div>

                      {ep.altTimeMin != null && (
                        <div className="q-metric-item">
                          <span className="q-metric-label">Alternatif layak terdekat:</span>
                          <strong className="q-metric-val">
                            {ep.altOutside ? 'Di luar NTT (NTB)' : formatMinutes(ep.altTimeMin)}
                          </strong>
                        </div>
                      )}

                      {ep.diffMin != null && ep.diffMin > 0 && (
                        <div className="q-metric-item extra-time">
                          <span className="q-metric-label">Selisih waktu tempuh:</span>
                          <strong className="q-metric-val-alert">
                            +{ep.diffMin.toFixed(1)} menit
                          </strong>
                        </div>
                      )}

                      <div className="q-metric-item reason">
                        <span className="q-metric-label">Catatan rujukan:</span>
                        <span className="q-metric-reason">{getReasonLabel(ep.reason)}</span>
                      </div>
                    </div>

                    {/* Footer: ID discoverable & Action Button */}
                    <div className="q-card-footer">
                      <div className="q-id-wrap">
                        <span className="q-id-label">ID Episode:</span>
                        <code className="q-id-code">{ep.id}</code>
                        <button
                          type="button"
                          className="q-copy-btn"
                          onClick={(e) => handleCopyId(e, ep.id)}
                          title="Salin ID Episode"
                          aria-label={`Salin ID episode ${ep.id}`}
                        >
                          {copiedId === ep.id ? (
                            <Check size={12} className="copied" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>

                      <Link
                        href={investigationUrl}
                        className="q-inspect-cta"
                        aria-label={`Buka telaah rujukan episode ${ep.id}`}
                      >
                        <span>Buka Penelaahan</span>
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* No Results State */
            <div className="queue-empty-state">
              <Search size={36} className="empty-icon" />
              <h3>Tidak ada episode yang sesuai dengan filter</h3>
              <p>
                Tidak ditemukan episode rujukan dengan kriteria yang Anda terapkan.
                Silakan ubah kata kunci pencarian, sesuaikan filter kabupaten atau bulan,
                atau tekan tombol reset di bawah.
              </p>
              <button
                type="button"
                className="empty-reset-cta"
                onClick={resetAllFilters}
              >
                <RotateCcw size={15} />
                <span>Reset Semua Filter</span>
              </button>
            </div>
          )}
        </section>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <nav className="queue-pagination" aria-label="Navigasi halaman antrean">
            <button
              type="button"
              className="page-nav-btn"
              disabled={currentPage <= 1}
              onClick={() => {
                const prev = currentPage - 1;
                setCurrentPage(prev);
                updateUrl(filter, search, district, month, onlyGeoAI, prev);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Halaman Sebelumnya
            </button>

            <span className="page-indicator">
              Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
            </span>

            <button
              type="button"
              className="page-nav-btn"
              disabled={currentPage >= totalPages}
              onClick={() => {
                const next = currentPage + 1;
                setCurrentPage(next);
                updateUrl(filter, search, district, month, onlyGeoAI, next);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Halaman Berikutnya
            </button>
          </nav>
        )}
      </main>

      {aboutOpen && (
        <CaseDetails
          data={data}
          referral={null}
          onSelectCase={(id) => router.push(`/episode/${id}`)}
          onClose={() => setAboutOpen(false)}
        />
      )}
    </div>
  );
}
