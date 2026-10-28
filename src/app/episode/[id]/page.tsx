'use client';
import { useEffect, useState, use, Suspense } from 'react';
import { LoaderCircle } from 'lucide-react';
import { loadShowcase } from '@/lib/load-showcase';
import type { ShowcaseData } from '@/lib/showcase';
import EpisodeInvestigation from '@/components/showcase/EpisodeInvestigation';
import BrandLogo from '@/components/showcase/BrandLogo';

type PageProps = {
  params: Promise<{ id: string }>;
};

function InvestigationLoader({ params }: PageProps) {
  const resolvedParams = use(params);
  const episodeId = resolvedParams.id;

  const [data, setData] = useState<ShowcaseData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(false);
    loadShowcase(episodeId).then(result => { if (alive) setData(result); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [episodeId]);

  if (error) {
    return (
      <div className="boot-screen">
        <BrandLogo className="boot-logo" size={96} priority />
        <h2>Gagal memuat data penelaahan</h2>
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
        <h2>Memuat Penelaahan Kasus…</h2>
        <p>Menyiapkan konteks spasial dan profil faskes rujukan {episodeId}.</p>
        <LoaderCircle className="spin" size={26} />
      </div>
    );
  }

  return <EpisodeInvestigation key={episodeId} data={data} episodeId={episodeId} />;
}

export default function EpisodeDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="boot-screen">
          <LoaderCircle className="spin" size={26} />
          <p>Menyiapkan penelaahan episode…</p>
        </div>
      }
    >
      <InvestigationLoader params={params} />
    </Suspense>
  );
}
