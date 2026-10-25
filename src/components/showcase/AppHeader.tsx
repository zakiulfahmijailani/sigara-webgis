'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPinned, Info, Sparkles, Layers3, BarChart3, Home } from 'lucide-react';
import BrandLogo from './BrandLogo';

type Props = {
  onOpenAbout?: () => void;
};

export default function AppHeader({ onOpenAbout }: Props) {
  const pathname = usePathname();

  const isHome = pathname === '/';
  const isEpisode = pathname.startsWith('/episode');
  const isRingkasan = pathname.startsWith('/ringkasan');
  const isContoh = pathname.startsWith('/contoh-geoai');

  return (
    <header className="app-header">
      <Link href="/" className="brand" aria-label="SIGARA beranda">
        <BrandLogo className="header-logo" size={48} priority decorative />
        <div>
          <strong>
            SIGARA<span> / </span>
            <small>GeoAI NTT</small>
          </strong>
          <p>Rujukan akuntabel berbasis bukti penginderaan jauh.</p>
        </div>
      </Link>

      <nav className="header-nav" aria-label="Menu utama">
        <Link
          href="/"
          className={`header-nav-item ${isHome ? 'active' : ''}`}
        >
          <Home size={15} />
          <span>Beranda</span>
        </Link>
        <Link
          href="/episode?cat=red"
          className={`header-nav-item ${isEpisode ? 'active' : ''}`}
        >
          <Layers3 size={15} />
          <span>Episode Rujukan</span>
        </Link>
        <Link
          href="/ringkasan"
          className={`header-nav-item ${isRingkasan ? 'active' : ''}`}
        >
          <BarChart3 size={15} />
          <span>Ringkasan NTT</span>
        </Link>
        <Link
          href="/contoh-geoai"
          className={`header-nav-item ${isContoh ? 'active' : ''}`}
        >
          <Sparkles size={15} />
          <span>Contoh GeoAI</span>
        </Link>
      </nav>

      <div className="header-actions">
        <div className="header-context">
          <MapPinned size={14} />
          <span>NTT · 2024</span>
        </div>
        <span className="demo-badge">
          <span />
          POC v2
        </span>
        {onOpenAbout && (
          <button
            type="button"
            className="text-button"
            onClick={onOpenAbout}
            aria-label="Informasi tentang aplikasi"
          >
            <Info size={16} />
            <span>Tentang</span>
          </button>
        )}
      </div>
    </header>
  );
}
