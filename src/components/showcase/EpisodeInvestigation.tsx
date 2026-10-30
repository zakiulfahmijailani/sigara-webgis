'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Info,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Route as RouteIcon,
  Sparkles,
  FileText,
  Layers,
  Database,
  Building2,
  Copy,
  Check,
  Activity,
  Layers3,
  Compass,
  FileCheck,
  Share2,
  HelpCircle,
  Play,
  RotateCcw,
  CheckCircle,
  LoaderCircle,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  ShowcaseData,
  Episode,
  GeoAIImage,
  Visit,
} from '@/lib/showcase';
import {
  categoryFromMaster,
  labels,
  colors,
  formatNumber,
  formatMinutes,
  formatKm,
  formatFacilityName,
  dateLabel,
  monthLabel,
  getReasonLabel,
} from '@/lib/showcase';
import AppHeader from './AppHeader';
import BrandLogo from './BrandLogo';
import CaseDetails from './CaseDetails';
import { investigationBackHref } from '@/lib/map-overview';
import SigaraIndexCard from './index/SigaraIndexCard';
import InlineGeoAIEvidence from './index/InlineGeoAIEvidence';
import PillarBreakdown from './index/PillarBreakdown';
import IndexDataFlow from './index/IndexDataFlow';
import SourceVariableDetails from './index/SourceVariableDetails';
import GeoAIMetricBreakdown from './index/GeoAIMetricBreakdown';
import { buildEpisodeExplanation } from '@/lib/sigara-index';

const NTTMap = dynamic(() => import('./NTTMap'), {
  ssr: false,
  loading: () => (
    <div className="map-loading" style={{ minHeight: '440px' }}>
      <Compass size={32} className="spin" />
      <span>Menyiapkan peta interaktif episodeâ€¦</span>
    </div>
  ),
});

type Props = {
  data: ShowcaseData;
  episodeId: string;
};

type InvestigationTab = 'summary' | 'visits' | 'methods';

const simulationAgents = [
  { name: 'Agen Data & Wilayah', action: 'Memeriksa cakupan master rujukan NTT', icon: Database },
  { name: 'Agen Kapabilitas Faskes', action: 'Menyaring layanan dan kapasitas faskes rujukan', icon: Building2 },
  { name: 'Agen GeoAI & Aksesibilitas', action: 'Menghitung proksi jarak dan selisih waktu tempuh fasilitas', icon: RouteIcon },
  { name: 'Agen Konteks Penginderaan Jauh', action: 'Mencocokkan citra Sentinel-2 dan overlay indeks sintetis', icon: Sparkles },
  { name: 'Agen Pola Rujukan', action: 'Menganalisis pasangan OD dan alternatif terdekat', icon: Activity },
  { name: 'Agen Sintesis Bukti', action: 'Menyusun berkas penelaahan akuntabilitas rujukan', icon: CheckCircle2 },
];

export default function EpisodeInvestigation({ data, episodeId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Find target episode
  const episode = useMemo(() => {
    return data.episodes.find((e) => String(e.id) === String(episodeId)) || null;
  }, [data.episodes, episodeId]);

  // Tab state (query param or default to summary)
  const rawTab = searchParams.get('tab');
  const activeTab: InvestigationTab =
    rawTab === 'visits' || rawTab === 'methods'
      ? rawTab
      : 'summary';

  // Normalize legacy ?tab=evidence URL and scroll to inline evidence section
  useEffect(() => {
    if (typeof window !== 'undefined' && searchParams.get('tab') === 'evidence') {
      const current = new URL(window.location.href);
      current.searchParams.delete('tab');
      window.history.replaceState({}, '', current.pathname + (current.search ? current.search : ''));
      setTimeout(() => {
        document.getElementById('geoai-evidence')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, [searchParams]);

  // GeoAI State
  const [activeGeoAIImage, setActiveGeoAIImage] = useState<GeoAIImage | null>(null);
  const [showOverlay, setShowOverlay] = useState<boolean>(false);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.8);
  const [showSatelliteBackdrop, setShowSatelliteBackdrop] = useState<boolean>(true);
  const [focusRequest, setFocusRequest] = useState<number>(0);

  // Visits On-Demand State
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [loadingVisits, setLoadingVisits] = useState<boolean>(false);
  const [visitsError, setVisitsError] = useState<boolean>(false);

  // SIGARA Index mode + ref
  const [indexMode, setIndexMode] = useState<'master' | 'multipillar_demo'>('master');
  const indexDataFlowRef = useRef<HTMLElement>(null);

  // UI helpers
  const [copiedId, setCopiedId] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  // Agent Simulation state
  const [agentStep, setAgentStep] = useState(-1);
  const [agentCompleted, setAgentCompleted] = useState(false);
  const simTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (simTimer.current) clearInterval(simTimer.current); }, []);

  // Sync GeoAI image when episode or tab changes
  useEffect(() => {
    if (!episode || !data.geoai) {
      setActiveGeoAIImage(null);
      return;
    }
    const matching = data.geoai.images.filter(
      (img) => String(img.episode) === String(episode.id)
    );
    if (matching.length > 0) {
      setActiveGeoAIImage(matching[0]);
    } else {
      setActiveGeoAIImage(null);
    }
  }, [episode, data.geoai]);

  // Auto-enable overlay when switching to evidence tab
  const handleTabChange = (tab: InvestigationTab) => {
    const current = new URLSearchParams(searchParams.toString());
    current.set('tab', tab);
    router.replace(`/episode/${episodeId}?${current.toString()}`, { scroll: false });
  };

  // Load visits on-demand when user opens "visits" tab
  useEffect(() => {
    if (activeTab === 'visits' && visits === null && episode) {
      setLoadingVisits(true);
      setVisitsError(false);
      fetch(`/api/showcase/visits?episodeId=${encodeURIComponent(episode.id)}`)
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((res) => {
          setVisits(res.visits || []);
          setLoadingVisits(false);
        })
        .catch(() => {
          setVisitsError(true);
          setLoadingVisits(false);
        });
    }
  }, [activeTab, visits, episode]);

  // Agent simulation trigger
  const runAgentSim = () => {
    if (simTimer.current) return;
    setAgentCompleted(false);
    setAgentStep(0);
    let next = 0;
    simTimer.current = setInterval(() => {
      next++;
      setAgentStep(next);
      if (next === simulationAgents.length) {
        clearInterval(simTimer.current!);
        simTimer.current = null;
        setAgentCompleted(true);
        setAgentStep(-1);
      }
    }, 700);
  };

  const handleCopyId = () => {
    if (!episode) return;
    navigator.clipboard.writeText(episode.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Build the "Kembali ke antrean" link preserving search/filter params
  const backToQueueUrl = investigationBackHref(new URLSearchParams(searchParams));

  // If episode not found in dataset: Truthful Not Found Screen
  if (!episode) {
    return (
      <div className="investigation-container">
        <AppHeader onOpenAbout={() => setAboutOpen(true)} />
        <main className="investigation-not-found">
          <AlertTriangle size={48} className="not-found-icon" />
          <h2>Episode Tidak Ditemukan</h2>
          <p>
            Episode dengan ID <code>{episodeId}</code> tidak tercatat dalam master dataset rujukan NTT 2024.
          </p>
          <div className="not-found-actions">
            <Link href="/episode" className="primary-button">
              <ArrowLeft size={16} />
              <span>Kembali ke Antrean Episode</span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const cat = categoryFromMaster(episode.cat);

  // Build SIGARA Index explanation (memoised)
  const indexExplanation = useMemo(
    () => buildEpisodeExplanation(episode, indexMode, data.geoai),
    [episode, indexMode, data.geoai]
  );
  const readableFrom = formatFacilityName(episode.fromName, 'asal');
  const readableTo = formatFacilityName(episode.toName, 'tujuan');
  const readableAlt = episode.altName
    ? formatFacilityName(episode.altName, 'alternatif')
    : episode.altId || null;

  return (
    <div className="investigation-container">
      <AppHeader onOpenAbout={() => setAboutOpen(true)} />

      {/* Persistent Breadcrumb & Case Bar */}
      <div className="investigation-top-bar">
        <div className="top-bar-inner">
          <Link href={backToQueueUrl} className="back-link">
            <ArrowLeft size={16} />
            <span>{searchParams.get('from') === 'map' ? 'Kembali ke peta NTT' : 'Kembali ke daftar episode'}</span>
          </Link>

          <div className="top-bar-badges">
            <span className={`q-status-badge ${cat}`}>
              <span className={`q-status-dot ${cat}`} />
              {labels[cat]}
            </span>
            <span className="sim-poc-pill">Simulasi POC</span>
            {episode.hasGeoAI && (
              <span className="geoai-available-pill">
                <Sparkles size={13} />
                Bukti GeoAI
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="investigation-main">
        {/* Case Title Card */}
        <section className="inv-title-section">
          <div className="inv-title-left">
            <div className="inv-od-names">
              <h2>{readableFrom}</h2>
              <ArrowRight size={20} className="inv-arrow" />
              <h2>{readableTo}</h2>
            </div>

            <div className="inv-meta-row">
              <span>
                <MapPin size={13} />
                {episode.kabAsal} â†’ {episode.kabTujuan}
              </span>
              <span className="meta-sep">Â·</span>
              <span>
                <Calendar size={13} />
                {dateLabel(episode.firstDate)}
              </span>
              <span className="meta-sep">Â·</span>
              <span>{episode.visitCount} kunjungan rujukan</span>
            </div>
          </div>

          <div className="inv-title-right">
            <div className="inv-id-box">
              <span className="inv-id-label">ID Episode:</span>
              <code className="inv-id-code">{episode.id}</code>
              <button
                type="button"
                className="inv-copy-btn"
                onClick={handleCopyId}
                title="Salin ID Episode"
                aria-label="Salin ID episode"
              >
                {copiedId ? <Check size={14} className="copied" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="inv-disclaimer">
              Prioritas penelaahan simulasi Â· Bukan penetapan kecurangan (fraud).
            </p>
          </div>
        </section>

        {/* Tab Navigation */}
        <nav className="inv-tabs" role="tablist" aria-label="Bagian penelaahan episode" onKeyDown={event => {
          const tabs: InvestigationTab[] = ['summary', 'visits', 'methods'];
          const index = tabs.indexOf(activeTab);
          const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : -1;
          if (next >= 0) { event.preventDefault(); handleTabChange(tabs[next]); document.getElementById(`investigation-tab-${tabs[next]}`)?.focus(); }
        }}>
          <button
            type="button"
            role="tab"
            id="investigation-tab-summary"
            aria-controls="investigation-tab-content"
            tabIndex={activeTab === 'summary' ? 0 : -1}
            aria-selected={activeTab === 'summary'}
            className={`inv-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => handleTabChange('summary')}
          >
            <FileText size={16} />
            <span>Ringkasan Kasus</span>
          </button>



          <button
            type="button"
            role="tab"
            id="investigation-tab-visits"
            aria-controls="investigation-tab-content"
            tabIndex={activeTab === 'visits' ? 0 : -1}
            aria-selected={activeTab === 'visits'}
            className={`inv-tab-btn ${activeTab === 'visits' ? 'active' : ''}`}
            onClick={() => handleTabChange('visits')}
          >
            <Activity size={16} />
            <span>Kunjungan Terkait ({episode.visitCount})</span>
          </button>

          <button
            type="button"
            role="tab"
            id="investigation-tab-methods"
            aria-controls="investigation-tab-content"
            tabIndex={activeTab === 'methods' ? 0 : -1}
            aria-selected={activeTab === 'methods'}
            className={`inv-tab-btn ${activeTab === 'methods' ? 'active' : ''}`}
            onClick={() => handleTabChange('methods')}
          >
            <Database size={16} />
            <span>Metode &amp; Sumber</span>
          </button>
        </nav>

        {/* Tab Content + Map Grid */}
        <div className="inv-content-grid">
          {/* Left Column: Focused Detail Panes */}
          <div className="inv-panel-left" role="tabpanel" id="investigation-tab-content" aria-labelledby={`investigation-tab-${activeTab}`} tabIndex={0}>
            {activeTab === 'summary' && (
              <div className="inv-summary-pane">
                {/* 2. Kartu SIGARA Index yang menonjol */}
                <SigaraIndexCard
                  explanation={indexExplanation}
                  compact={false}
                  onToggleMode={setIndexMode}
                />

                {/* 3. Bagian Rincian Pilar */}
                <PillarBreakdown
                  pillars={indexExplanation.pillars}
                  mode={indexMode}
                />
                {/* 1. Mengapa episode ini ditandai? */}
                <div className={`plain-card question-1 ${cat}`}>
                  <div className="card-question-header">
                    <span className="card-q-number">1</span>
                    <h3>Mengapa episode ini ditandai?</h3>
                  </div>
                  <div className="card-q-body">
                    {cat === 'red' ? (
                      <p>
                        Episode rujukan ini berada pada kategori <strong>Indikasi Tinggi (TINGGI_SIM)</strong>.
                        Pasien dirujuk ke faskes tujuan dengan estimasi waktu tempuh proksi{' '}
                        <strong>{formatMinutes(episode.timeMin)}</strong> ({formatKm(episode.distM)}),
                        sedangkan tersedia faskes alternatif layak terdekat dengan estimasi waktu tempuh{' '}
                        <strong>
                          {episode.altOutside ? 'di luar NTT' : formatMinutes(episode.altTimeMin)}
                        </strong>
                        .
                        {episode.diffMin != null && episode.diffMin > 0 && (
                          <span>
                            {' '}Terdapat selisih waktu tempuh tambahan sebesar{' '}
                            <strong className="text-alert">+{episode.diffMin.toFixed(1)} menit</strong>{' '}
                            (rasio {episode.timeRatio ? `${episode.timeRatio.toFixed(1)}Ã—` : 'â€”'} waktu perjalanan).
                          </span>
                        )}
                      </p>
                    ) : cat === 'orange' ? (
                      <p>
                        Episode rujukan ini berada pada kategori <strong>Indikasi Sedang (SEDANG_SIM)</strong>.
                        Periksa perbandingan waktu proksi dan catatan rujukan di bawah untuk memahami konteks episode ini.
                      </p>
                    ) : (
                      <p>
                        Episode rujukan ini berada pada kategori <strong>Indikasi Rendah (RENDAH_SIM)</strong>.
                        Kategori ini berasal dari master simulasi. Perbandingan waktu proksi dan catatan rujukan tetap dapat ditelaah; kategori rendah tidak membuktikan ketiadaan fraud.
                      </p>
                    )}

                    <div className="reason-pill-box">
                      <span className="reason-label">Alasan master / catatan rujukan:</span>
                      <strong>{getReasonLabel(episode.reason)}</strong>
                    </div>
                  </div>
                </div>

                {/* 2. Alternatif apa yang tersedia? */}
                <div className="plain-card question-2">
                  <div className="card-question-header">
                    <span className="card-q-number">2</span>
                    <h3>Alternatif apa yang tersedia?</h3>
                  </div>
                  <div className="card-q-body">
                    {episode.altId ? (
                      <div className="alt-facility-card">
                        <div className="alt-facility-top">
                          <div>
                            <span className="alt-role-label">Fasilitas Alternatif Terdekat Layak</span>
                            <strong className="alt-name">{readableAlt}</strong>
                            <span className="alt-id-sub">ID Faskes: {episode.altId}</span>
                          </div>
                          <div className="alt-time-box">
                            <span className="alt-time-label">Waktu Tempuh</span>
                            <strong className="alt-time-val">
                              {episode.altOutside ? 'Luar NTT' : formatMinutes(episode.altTimeMin)}
                            </strong>
                          </div>
                        </div>

                        {episode.altOutside && (
                          <div className="alt-outside-warning">
                            <AlertTriangle size={15} />
                            <span>
                              <strong>Perhatian Batas Wilayah:</strong> Faskes alternatif terdekat secara geografis
                              berada di luar batas Provinsi NTT (Provinsi NTB).
                              Fasilitas ini tidak diikutsertakan sebagai titik referensi faskes internal NTT.
                            </span>
                          </div>
                        )}

                        <div className="alt-stats-grid">
                          <div>
                            <span>Jarak Asal â†’ Tujuan</span>
                            <strong>{formatKm(episode.distM)}</strong>
                          </div>
                          <div>
                            <span>Waktu ke Tujuan</span>
                            <strong>{formatMinutes(episode.timeMin)}</strong>
                          </div>
                          <div>
                            <span>Waktu ke Alternatif</span>
                            <strong>
                              {episode.altOutside ? 'Luar NTT' : formatMinutes(episode.altTimeMin)}
                            </strong>
                          </div>
                          <div>
                            <span>Selisih Waktu</span>
                            <strong className={episode.diffMin && episode.diffMin > 0 ? 'text-alert' : ''}>
                              {episode.diffMin != null ? `${episode.diffMin > 0 ? '+' : ''}${episode.diffMin.toFixed(1)} menit` : 'â€”'}
                            </strong>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="no-alt-text">
                        Tidak ada faskes alternatif layak yang lebih dekat tercatat dalam master untuk episode ini.
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Bukti apa yang tersedia atau masih kurang? */}
                <div className="plain-card question-3">
                  <div className="card-question-header">
                    <span className="card-q-number">3</span>
                    <h3>Bukti apa yang tersedia atau masih kurang?</h3>
                  </div>
                  <div className="card-q-body">
                    <div className="evidence-checklist">
                      <div className="evidence-check-item">
                        <CheckCircle size={18} className="check-ok" />
                        <div>
                          <strong>Data Master Rujukan BPJS 2024</strong>
                          <p>
                            Tercatat {episode.visitCount} kunjungan rujukan lengkap dengan tanggal faskes asal dan tujuan.
                          </p>
                        </div>
                      </div>

                      <div className="evidence-check-item">
                        <CheckCircle size={18} className="check-ok" />
                        <div>
                          <strong>Katalog Faskes Referensi NTT</strong>
                          <p>
                            Tersedia {formatNumber(data.summary.totals.facilitiesReference)} titik referensi fasilitas NTT. Status verifikasi peran dan keberadaan pada 2024 perlu diperiksa pada sumber fasilitas.
                          </p>
                        </div>
                      </div>

                      <div className="evidence-check-item">
                        {episode.hasGeoAI ? (
                          <CheckCircle size={18} className="check-geoai" />
                        ) : (
                          <Info size={18} className="check-missing" />
                        )}
                        <div>
                          <strong>
                            {episode.hasGeoAI
                              ? 'Ilustrasi GeoAI Penginderaan Jauh Tersedia'
                              : 'Ilustrasi GeoAI Belum Ada untuk Episode Ini'}
                          </strong>
                          <p>
                            {episode.hasGeoAI
                              ? 'Tersedia 2 skenario ilustrasi generatif v4 dan telaah spektral indikator pada bagian Bukti GeoAI di bawah diagram aliran data.'
                              : 'Paket ilustrasi generatif v4 mencakup 8 episode percontohan. Episode ini belum memiliki berkas ilustrasi generatif terdaftar.'}
                          </p>
                          {episode.hasGeoAI && (
                            <button
                              type="button"
                              className="view-geoai-cta"
                              onClick={() => {
                                document.getElementById('geoai-evidence')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                            >
                              <Sparkles size={13} />
                              <span>Lihat Bukti GeoAI di Bawah</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Kunjungan Terkait Tab */}
            {activeTab === 'visits' && (
              <div className="inv-visits-pane">
                <div className="visits-header">
                  <div>
                    <h3>Daftar Kunjungan Rujukan</h3>
                    <p>Total {episode.visitCount} catatan kunjungan dalam episode {episode.id}</p>
                  </div>
                </div>

                {loadingVisits && (
                  <div className="visits-loading">
                    <LoaderCircle size={22} className="spin" />
                    <span>Memuat riwayat kunjungan dari repositori dataâ€¦</span>
                  </div>
                )}

                {visitsError && (
                  <div className="visits-error">
                    <AlertTriangle size={18} />
                    <span>Gagal memuat rincian kunjungan.</span>
                  </div>
                )}

                {visits && visits.length > 0 && (
                  <div className="visits-table-wrap">
                    <table className="visits-table">
                      <thead>
                        <tr>
                          <th>No</th>
                          <th>ID Kunjungan</th>
                          <th>Tanggal FKTP</th>
                          <th>Tanggal FKRTL</th>
                          <th>Diagnosa</th>
                          <th>Poli</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visits.map((v, i) => (
                          <tr key={v.visitId || i}>
                            <td>{i + 1}</td>
                            <td><code>{v.visitId}</code></td>
                            <td>{dateLabel(v.dateFktp)}</td>
                            <td>{dateLabel(v.dateFkrtl)}</td>
                            <td>{v.diagnosa || 'â€”'}</td>
                            <td>{v.poli || 'Belum tersedia'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {visits && visits.length === 0 && (
                  <p className="no-visits">Tidak ada data rincian kunjungan individual.</p>
                )}
              </div>
            )}

            {/* Metode & Sumber Tab */}
            {activeTab === 'methods' && (
              <div className="inv-methods-pane">
                <h3>Metodologi Penelaahan Akuntabilitas &amp; Batasan POC</h3>

                <div className="methods-grid">
                  <div className="method-box">
                    <h4>1. Proksi Jarak &amp; Waktu Tempuh</h4>
                    <p>
                      Jarak dan waktu tempuh fasilitas dihitung menggunakan proksi jarak Haversine
                      dan model kecepatan jalan darat / penyeberangan antarpulau rata-rata kepulauan NTT.
                      Garis putus-putus pada peta menunjukkan proksi akses, bukan rute GPS navigasi aktual.
                    </p>
                    <code className="formula-block">
                      selisih_menit = waktu_tujuan - waktu_alternatif_layak
                    </code>
                  </div>

                  <div className="method-box">
                    <h4>2. Mosaik Penginderaan Jauh</h4>
                    <p>
                      Latar citra satelit bersumber dari <strong>EOX Sentinel-2 cloudless annual RGB mosaic 2024</strong>.
                      Resolusi spasial nominal 10â€“20 meter. Mosaik tahunan memberikan konteks spasial bebas awan
                      tetapi bukan observasi tanggal peristiwa bencana aktual.
                    </p>
                    <p className="method-sub">Lisensi: Creative Commons BY-NC-SA 4.0.</p>
                  </div>

                  <div className="method-box">
                    <h4>3. Overlay Indeks Sintetis POC</h4>
                    <p>
                      Overlay raster bencana (banjir/MNDWI, longsor/dNDVI, kebakaran/dNBR) disimulasikan
                      secara sintetis untuk tujuan percontohan evaluasi GeoAI (Proof of Concept).
                      Skenario A dan B adalah dua kemungkinan hipotesis analisis, bukan observasi historis ganda.
                    </p>
                  </div>

                  <div className="method-box">
                    <h4>4. Kategori Indikasi Master</h4>
                    <p>
                      Kategori TINGGI_SIM, SEDANG_SIM, dan RENDAH_SIM berasal dari dataset master simulasi.
                      Penelaahan ini merupakan sistem pendukung keputusan (decision support)
                      dan bukan penetapan kecurangan (fraud determination).
                    </p>
                  </div>
                </div>

                {/* Inventaris 12 Variabel & Provenance Data */}
                <SourceVariableDetails variables={indexExplanation.variables} />

                {/* Educational Agent Simulation Section */}
                <div className="agent-sim-box">
                  <div className="agent-sim-header">
                    <div>
                      <span className="agent-sim-eyebrow">Simulasi Alur Agen</span>
                      <h4>Orkestrasi 6 Agen Penelaahan Rujukan Akuntabel</h4>
                      <p>
                        Status: <strong>Dataset simulasi siap ditelaah</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      className="primary-button run-sim-btn"
                      disabled={agentStep >= 0}
                      onClick={runAgentSim}
                    >
                      {agentStep >= 0 ? (
                        <>
                          <LoaderCircle size={15} className="spin" />
                          <span>Menjalankan alur agenâ€¦</span>
                        </>
                      ) : (
                        <>
                          <Play size={15} />
                          <span>Jalankan Simulasi Alur Agen</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="agent-sim-steps">
                    {simulationAgents.map((ag, i) => {
                      const Icon = ag.icon;
                      const isDone = agentCompleted || (agentStep >= 0 && i < agentStep);
                      const isCurrent = agentStep === i;

                      return (
                        <div
                          key={ag.name}
                          className={`sim-step-item ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
                        >
                          <span className="sim-step-icon">
                            {isDone ? (
                              <Check size={14} />
                            ) : isCurrent ? (
                              <LoaderCircle size={14} className="spin" />
                            ) : (
                              <Icon size={14} />
                            )}
                          </span>
                          <div className="sim-step-content">
                            <strong>{ag.name}</strong>
                            <p>{ag.action}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Map */}
          <div className="inv-panel-right">
            <div className="inv-map-wrap">
              <div className="inv-map-header">
                <span className="inv-map-title">
                  <Compass size={14} />
                  Peta Spasial Rujukan &amp; Faskes Terdekat
                </span>
                <span className="inv-map-badge">Konteks episode</span>
              </div>

              <div className="inv-map-frame">
                <NTTMap
                  compact
                  data={data}
                  episodes={data.episodes}
                  selected={episode}
                  activeGeoAIImage={activeGeoAIImage}
                  showOverlay={showOverlay}
                  setShowOverlay={setShowOverlay}
                  overlayOpacity={overlayOpacity}
                  setOverlayOpacity={setOverlayOpacity}
                  showSatelliteBackdrop={showSatelliteBackdrop}
                  setShowSatelliteBackdrop={setShowSatelliteBackdrop}
                  focusRequest={focusRequest}
                  onSelect={(id) => router.push(`/episode/${id}`)}
                />
              </div>

              <div className="inv-map-footer">
                <div className="map-legend-pills">
                  <span className="pill origin-pill">
                    <span className="dot origin-dot" />
                    Asal ({readableFrom})
                  </span>
                  <span className="pill dest-pill">
                    <span className="dot dest-dot" />
                    Tujuan ({readableTo})
                  </span>
                  {episode.altId && (
                    <span className="pill alt-pill">
                      <span className="dot alt-dot" />
                      Alternatif ({episode.altOutside ? 'Luar NTT' : readableAlt})
                    </span>
                  )}
                </div>
                <p className="map-caption">
                  Garis putus-putus menggambarkan garis OD dan proksi aksesibilitas, bukan rute fisik jalan raya.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width Index Data Flow section */}
        <div ref={indexDataFlowRef as any} style={{ width: '100%', padding: '0 0 30px' }}>
          <IndexDataFlow
            explanation={indexMode === 'multipillar_demo' ? indexExplanation : null}
            mode={indexExplanation.graphMode}
            globalTitle="DATA FLOW — TRANSPARANSI METODOLOGI"
            onNavigateToGeoAI={episode.hasGeoAI ? () => {
              document.getElementById('geoai-evidence')?.scrollIntoView({ behavior: 'smooth' });
            } : undefined}
            hasGeoAIImage={episode.hasGeoAI}
          />
        </div>

        {/* Full-width Inline GeoAI Evidence section right below Data Flow */}
        <InlineGeoAIEvidence
          episode={episode}
          geoaiPillar={indexExplanation.pillars.find((p) => p.id === 'geoai')}
          mode={indexMode}
        />
      </main>

      {aboutOpen && (
        <CaseDetails
          data={data}
          referral={episode}
          onSelectCase={(id) => router.push(`/episode/${id}`)}
          onClose={() => setAboutOpen(false)}
        />
      )}
    </div>
  );
}
