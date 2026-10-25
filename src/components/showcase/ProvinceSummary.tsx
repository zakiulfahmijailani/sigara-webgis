'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Building2,
  Users,
  Layers3,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Compass,
  ArrowRight,
  Filter as FilterIcon,
  ChevronRight,
} from 'lucide-react';
import type { ShowcaseData } from '@/lib/showcase';
import { formatNumber, categoryFromMaster } from '@/lib/showcase';
import AppHeader from './AppHeader';
import BrandLogo from './BrandLogo';

const NTTMap = dynamic(() => import('./NTTMap'), {
  ssr: false,
  loading: () => (
    <div className="map-loading" style={{ minHeight: '520px' }}>
      <Compass size={32} className="spin" />
      <span>Menyiapkan peta provinsi NTT dan 879 faskes…</span>
    </div>
  ),
});

type Props = {
  data: ShowcaseData;
};

export default function ProvinceSummary({ data }: Props) {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter episodes for map and aggregate calculation
  const filteredEpisodes = useMemo(() => {
    return data.episodes.filter((ep) => {
      const matchDist =
        selectedDistrict === 'all' ||
        ep.kabAsal === selectedDistrict ||
        ep.kabTujuan === selectedDistrict;
      const matchCat =
        selectedCategory === 'all' ||
        categoryFromMaster(ep.cat) === selectedCategory;
      return matchDist && matchCat;
    });
  }, [data.episodes, selectedDistrict, selectedCategory]);

  // District breakdowns dynamically computed from dataset
  const districtStats = useMemo(() => {
    const map = new Map<string, { total: number; red: number; orange: number; green: number }>();
    for (const d of data.summary.districts) {
      map.set(d, { total: 0, red: 0, orange: 0, green: 0 });
    }
    for (const ep of data.episodes) {
      const origin = ep.kabAsal;
      if (map.has(origin)) {
        const item = map.get(origin)!;
        item.total++;
        const c = categoryFromMaster(ep.cat);
        item[c]++;
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [data.summary.districts, data.episodes]);

  return (
    <div className="summary-page-container">
      <AppHeader />

      <main className="summary-main">
        {/* Header Section */}
        <section className="summary-header">
          <div className="summary-breadcrumb">
            <Link href="/">Beranda</Link>
            <ChevronRight size={13} />
            <span>Ringkasan Provinsi NTT</span>
          </div>

          <h1 className="summary-title">Ringkasan Wilayah Nusa Tenggara Timur</h1>
          <p className="summary-subtitle">
            Cakupan komprehensif 21 kabupaten/kota, 879 titik fasilitas pelayanan kesehatan referensi,
            dan 3.683 episode rujukan BPJS Kesehatan tahun 2024.
          </p>
        </section>

        {/* Global KPIs */}
        <section className="summary-kpis">
          <div className="kpi-card">
            <span className="kpi-icon blue"><Layers3 size={20} /></span>
            <div className="kpi-content">
              <span className="kpi-label">Total Episode Rujukan</span>
              <strong className="kpi-val">{formatNumber(data.summary.totals.episodes)}</strong>
              <small className="kpi-sub">{formatNumber(data.summary.totals.visits)} kunjungan rujukan</small>
            </div>
          </div>

          <div className="kpi-card">
            <span className="kpi-icon green"><Building2 size={20} /></span>
            <div className="kpi-content">
              <span className="kpi-label">Faskes Referensi NTT</span>
              <strong className="kpi-val">{formatNumber(data.summary.totals.facilitiesReference)}</strong>
              <small className="kpi-sub">879 faskes terverifikasi koordinat</small>
            </div>
          </div>

          <div className="kpi-card">
            <span className="kpi-icon red"><AlertTriangle size={20} /></span>
            <div className="kpi-content">
              <span className="kpi-label">Indikasi Tinggi (Simulasi)</span>
              <strong className="kpi-val">{formatNumber(data.summary.episodeCategories.TINGGI_SIM)}</strong>
              <small className="kpi-sub">Prioritas penelaahan proksi akses</small>
            </div>
          </div>

          <div className="kpi-card">
            <span className="kpi-icon purple"><Users size={20} /></span>
            <div className="kpi-content">
              <span className="kpi-label">Peserta Terdaftar</span>
              <strong className="kpi-val">{formatNumber(data.summary.totals.participants)}</strong>
              <small className="kpi-sub">Peserta dalam master 2024</small>
            </div>
          </div>
        </section>

        {/* Filters and Province Map Grid */}
        <div className="summary-grid">
          {/* Left Column: District Table / Selector */}
          <div className="summary-left-col">
            <div className="filter-panel">
              <h3 className="filter-title">
                <FilterIcon size={15} />
                <span>Penyaringan Wilayah</span>
              </h3>

              <div className="filter-group">
                <label htmlFor="dist-select">Kabupaten / Kota Asal:</label>
                <select
                  id="dist-select"
                  className="filter-select"
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                >
                  <option value="all">Seluruh NTT (21 Kab/Kota)</option>
                  {data.summary.districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="cat-select">Kategori Prioritas:</label>
                <select
                  id="cat-select"
                  className="filter-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">Semua Kategori (3.683)</option>
                  <option value="red">Indikasi Tinggi (364)</option>
                  <option value="orange">Indikasi Sedang (23)</option>
                  <option value="green">Indikasi Rendah (3.296)</option>
                </select>
              </div>

              <div className="filter-action-box">
                <Link
                  href={`/episode?district=${selectedDistrict}&cat=${selectedCategory}`}
                  className="open-queue-link"
                >
                  <span>Buka di Antrean Episode</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* District Breakdown Table */}
            <div className="district-table-card">
              <h3 className="table-card-title">Distribusi Episode per Kabupaten Asal</h3>
              <div className="district-table-wrap">
                <table className="district-table">
                  <thead>
                    <tr>
                      <th>Kab/Kota</th>
                      <th>Total</th>
                      <th>Tinggi</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {districtStats.map(([dist, s]) => (
                      <tr
                        key={dist}
                        className={selectedDistrict === dist ? 'active-row' : ''}
                      >
                        <td>
                          <strong>{dist}</strong>
                        </td>
                        <td>{formatNumber(s.total)}</td>
                        <td>
                          <span className={s.red > 0 ? 'red-text' : ''}>
                            {formatNumber(s.red)}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="dist-focus-btn"
                            onClick={() => setSelectedDistrict(dist === selectedDistrict ? 'all' : dist)}
                          >
                            {selectedDistrict === dist ? 'Reset' : 'Sorot'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Full NTT Map */}
          <div className="summary-right-col">
            <div className="summary-map-card">
              <div className="summary-map-header">
                <div>
                  <strong>Peta Sebaran Kepulauan NTT &amp; 879 Faskes Referensi</strong>
                  <p>
                    {filteredEpisodes.length} episode aktif · Batas 21 kabupaten/kota
                  </p>
                </div>
                <span className="summary-map-badge">Wilayah Penuh</span>
              </div>

              <div className="summary-map-frame">
                <NTTMap
                  data={data}
                  episodes={filteredEpisodes}
                  selected={null}
                  activeGeoAIImage={null}
                  showOverlay={false}
                  setShowOverlay={() => {}}
                  overlayOpacity={0.8}
                  setOverlayOpacity={() => {}}
                  showSatelliteBackdrop={false}
                  setShowSatelliteBackdrop={() => {}}
                  focusRequest={0}
                  onSelect={() => {}}
                />
              </div>

              <div className="summary-map-notes">
                <span>Titik faskes referensi mencakup seluruh FKTP dan FKRTL terdaftar di Provinsi NTT.</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
