'use client';
import { useEffect, useState, Suspense } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { ShowcaseData } from '@/lib/showcase';
import GeoAICatalogue from '@/components/showcase/GeoAICatalogue';
import BrandLogo from '@/components/showcase/BrandLogo';

function GeoAICatalogueLoader() {
  const [data, setData] = useState<ShowcaseData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/showcase')
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((res) => {
        if (res?.data) setData(res.data);
      })
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="boot-screen">
        <BrandLogo className="boot-logo" size={96} priority />
        <h2>Gagal memuat katalog GeoAI</h2>
        <p>Silakan periksa koneksi atau segarkan peramban.</p>
        <button
          type="button"
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="boot-screen">
        <BrandLogo className="boot-logo" size={96} priority />
        <h2>Menyiapkan Katalog GeoAI NTT…</h2>
        <p>Memuat 16 aset citra Sentinel-2 dan overlay indeks spektral bencana.</p>
        <LoaderCircle className="spin" size={26} />
      </div>
    );
  }

  return <GeoAICatalogue data={data} />;
}

export default function GeoAICataloguePage() {
  return (
    <Suspense
      fallback={
        <div className="boot-screen">
          <LoaderCircle className="spin" size={26} />
          <p>Memuat katalog contoh bukti penginderaan jauh…</p>
        </div>
      }
    >
      <GeoAICatalogueLoader />
    </Suspense>
  );
}
