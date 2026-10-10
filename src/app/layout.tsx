import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'SIGARA — Agentic GeoAI untuk Rujukan Akuntabel',
  description: 'Showcase pemeriksaan rujukan Kota Kupang: peta, SIGARA Index, bukti yang dapat ditelusuri, dan simulasi agen. Seluruh kasus merupakan data sintetis.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
