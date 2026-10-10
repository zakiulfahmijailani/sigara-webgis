import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'SIGARA — Agentic GeoAI untuk Rujukan Akuntabel',
  description: 'Showcase pemeriksaan rujukan Kota Kupang: peta, SIGARA Index, bukti yang dapat ditelusuri, dan simulasi agen. Seluruh kasus merupakan data sintetis.',
  icons: {
    icon: [{ url: '/brand/bang-jakes.png', type: 'image/png' }],
    apple: [{ url: '/brand/bang-jakes.png', type: 'image/png' }],
  },
  openGraph: {
    title: 'SIGARA — Agentic GeoAI untuk Rujukan Akuntabel',
    description: 'Showcase pemeriksaan rujukan Kota Kupang bersama Bang Jakes.',
    images: [{ url: 'https://sigara-ntt.vercel.app/brand/bang-jakes.png', alt: 'Bang Jakes — logo SIGARA' }],
    locale: 'id_ID',
    type: 'website',
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id" className={plusJakartaSans.variable}><body>{children}</body></html>;
}
