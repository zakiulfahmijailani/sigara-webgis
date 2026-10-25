import { Suspense } from 'react';
import MapOverview from '@/components/showcase/MapOverview';

export default function HomePage() {
  return <Suspense fallback={<div className="boot-screen"><p>Menyiapkan peta NTT…</p></div>}><MapOverview /></Suspense>;
}
