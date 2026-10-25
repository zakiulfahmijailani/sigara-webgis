'use client';
import { useEffect, useState, Suspense } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { ShowcaseData } from '@/lib/showcase';
import ProvinceSummary from '@/components/showcase/ProvinceSummary';
import BrandLogo from '@/components/showcase/BrandLogo';

function RingkasanLoader() {
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
        <h2>Gagal memuat ringkasan provinsi</h2>
        <p>Silakan segarkan halaman untuk mencoba kembali.</p>
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
        <h2>Menyiapkan Ringkasan Provinsi NTT…</h2>
        <p>Memuat batas 21 kabupaten/kota dan 879 fasilitas pelayanan kesehatan.</p>
        <LoaderCircle className="spin" size={26} />
      </div>
    );
  }

  return <ProvinceSummary data={data} />;
}

export default function RingkasanPage() {
  return (
    <Suspense
      fallback={
        <div className="boot-screen">
          <LoaderCircle className="spin" size={26} />
          <p>Memuat ringkasan wilayah NTT…</p>
        </div>
      }
    >
      <RingkasanLoader />
    </Suspense>
  );
}
