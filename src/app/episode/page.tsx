'use client';
import { useEffect, useState, Suspense } from 'react';
import { LoaderCircle, MapPinned } from 'lucide-react';
import type { ShowcaseData } from '@/lib/showcase';
import EpisodeQueue from '@/components/showcase/EpisodeQueue';
import BrandLogo from '@/components/showcase/BrandLogo';

function EpisodeQueueLoader() {
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
        <h2>Data episode belum dapat dimuat</h2>
        <p>Silakan periksa koneksi atau segarkan peramban.</p>
        <button
          type="button"
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="boot-screen">
        <BrandLogo className="boot-logo" size={96} priority />
        <h2>Memuat Antrean Episode NTT…</h2>
        <p>Menyiapkan 3.683 episode rujukan dan faskes referensi.</p>
        <LoaderCircle className="spin" size={26} />
      </div>
    );
  }

  return <EpisodeQueue data={data} />;
}

export default function EpisodePage() {
  return (
    <Suspense
      fallback={
        <div className="boot-screen">
          <LoaderCircle className="spin" size={26} />
          <p>Menyiapkan daftar rujukan…</p>
        </div>
      }
    >
      <EpisodeQueueLoader />
    </Suspense>
  );
}
