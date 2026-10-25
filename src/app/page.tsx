'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, MapPin, Sparkles, ShieldCheck, ChevronRight } from 'lucide-react';
import BrandLogo from '@/components/showcase/BrandLogo';
import type { ShowcaseSummary } from '@/lib/showcase';
import { formatNumber } from '@/lib/showcase';

export default function HomePage() {
  const [summary, setSummary] = useState<ShowcaseSummary | null>(null);

  useEffect(() => {
    fetch('/api/showcase')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => { if (res?.data?.summary) setSummary(res.data.summary); })
      .catch(() => {});
  }, []);

  const tinggi = summary?.episodeCategories.TINGGI_SIM ?? 364;
  const total = summary?.totals.episodes ?? 3683;

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-brand">
          <BrandLogo className="home-logo" size={52} priority decorative />
          <div>
            <strong className="home-brand-name">SIGARA</strong>
            <span className="home-brand-sub">GeoAI · Nusa Tenggara Timur</span>
          </div>
        </div>
        <nav className="home-nav" aria-label="Navigasi utama">
          <Link href="/ringkasan" className="home-nav-link">Ringkasan NTT</Link>
          <Link href="/contoh-geoai" className="home-nav-link">Contoh GeoAI</Link>
        </nav>
      </header>

      <main className="home-main">
        <div className="home-hero">
          <div className="home-hero-content">
            <div className="home-eyebrow">
              <MapPin size={13} />
              <span>Provinsi Nusa Tenggara Timur · Healthkathon 2026</span>
            </div>

            <h1 className="home-title">
              Telaah rujukan di<br />
              <span className="home-title-accent">Nusa Tenggara Timur</span>
            </h1>

            <p className="home-subtitle">
              Pilih episode untuk memahami alasan indikasi, membandingkan fasilitas,
              dan meninjau bukti pendukung.
            </p>

            <div className="home-stats">
              <span>{formatNumber(total)} episode</span>
              <span className="home-stats-sep">·</span>
              <span>Data 2024</span>
              <span className="home-stats-sep">·</span>
              <span>Simulasi POC</span>
            </div>

            <p className="home-highlight">
              <ShieldCheck size={14} />
              <span>
                <strong>{formatNumber(tinggi)} episode</strong> memiliki indikasi simulasi tinggi
                — prioritas penelaahan.
              </span>
            </p>

            <div className="home-actions">
              <Link href="/episode?cat=red" className="home-cta-primary">
                Mulai penelaahan
                <ArrowRight size={18} />
              </Link>
              <div className="home-secondary-links">
                <Link href="/ringkasan" className="home-cta-secondary">
                  Lihat ringkasan NTT
                  <ChevronRight size={14} />
                </Link>
                <Link href="/contoh-geoai" className="home-cta-secondary">
                  <Sparkles size={14} />
                  Jelajahi contoh GeoAI
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>

            <div className="home-sim-note">
              <strong>Simulasi POC</strong> — Indikasi penelaahan dihitung dari proksi jarak dan
              aksesibilitas faskes berdasarkan data master sintetis 2024.
              Bukan penetapan kecurangan (fraud).
            </div>
          </div>

          <div className="home-hero-visual" aria-hidden="true">
            <BrandLogo className="home-mascot" size={220} priority decorative />
            <div className="home-hero-badge home-hero-badge-red">
              <span className="home-hero-badge-dot" />
              {formatNumber(tinggi)} Indikasi Tinggi
            </div>
            <div className="home-hero-badge home-hero-badge-green">
              <span className="home-hero-badge-dot" />
              879 Faskes Referensi
            </div>
            <div className="home-hero-badge home-hero-badge-blue">
              <Sparkles size={12} />
              16 Aset GeoAI
            </div>
          </div>
        </div>
      </main>

      <footer className="home-footer">
        <div className="home-footer-inner">
          <BrandLogo className="footer-logo" size={22} decorative />
          <span>SIGARA NTT · Data simulasi · 21 Kab/Kota</span>
          <span className="home-footer-sep">·</span>
          <span>Versi 2.0 · Healthkathon BPJS 2026</span>
        </div>
      </footer>
    </div>
  );
}
