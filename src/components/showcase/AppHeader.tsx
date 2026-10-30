'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPinned, Info, Layers3, BarChart3 } from 'lucide-react';
import BrandLogo from './BrandLogo';

type Props = {
  onOpenAbout?: () => void;
};

export default function AppHeader({ onOpenAbout }: Props) {
  const pathname = usePathname();

  const isHome = pathname === '/';
  const isEpisode = pathname.startsWith('/episode');
  const isRingkasan = pathname.startsWith('/ringkasan');

  return (
    <header className="app-header">
      <Link href="/" className="brand" aria-label="SIGARA beranda">
        <BrandLogo className="header-logo" size={48} priority decorative />
        <div>
          <strong>
            SIGARA<span> / </span>
            <small>GeoAI NTT</small>
          </strong>
          <p>Penelaahan rujukan berbasis konteks spasial.</p>
        </div>
      </Link>

      <nav className="header-nav" aria-label="Menu utama">
        <Link
          href="/"
          aria-current={isHome ? 'page' : undefined}
          className={`header-nav-item ${isHome ? 'active' : ''}`}
        >
          <MapPinned size={15} />
          <span>Peta NTT</span>
        </Link>
        <Link
          href="/episode?cat=red"
          aria-current={isEpisode ? 'page' : undefined}
          className={`header-nav-item ${isEpisode ? 'active' : ''}`}
        >
          <Layers3 size={15} />
          <span>Episode</span>
        </Link>
        <Link
          href="/ringkasan"
          aria-current={isRingkasan ? 'page' : undefined}
          className={`header-nav-item ${isRingkasan ? 'active' : ''}`}
        >
          <BarChart3 size={15} />
          <span>Ringkasan</span>
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
