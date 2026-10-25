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
  title: 'SIGARA — Agentic GeoAI untuk Rujukan Akuntabel Provinsi NTT',
  description:
    'Showcase pemeriksaan rujukan Provinsi Nusa Tenggara Timur: peta kepulauan, SIGARA Index, bukti GeoAI multispektral, dan simulasi penelaahan rujukan. Seluruh kasus merupakan data simulasi akuntabilitas.',
  icons: {
    icon: [{ url: '/brand/bang-jakes.png', type: 'image/png' }],
    apple: [{ url: '/brand/bang-jakes.png', type: 'image/png' }],
  },
  openGraph: {
    title: 'SIGARA — Agentic GeoAI untuk Rujukan Akuntabel Provinsi NTT',
    description:
      'Showcase pemeriksaan rujukan Provinsi Nusa Tenggara Timur (NTT) dengan integrasi bukti GeoAI multispektral bersama Bang Jakes.',
    images: [
      {
        url: 'https://sigara-ntt.vercel.app/brand/bang-jakes.png',
        alt: 'Bang Jakes — logo SIGARA',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body>{children}</body>
    </html>
  );
}
