'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Info,
  Maximize2,
  X,
  Layers,
  MapPin,
  Calendar,
  Compass,
} from 'lucide-react';
import type { ShowcaseData, GeoAIImage } from '@/lib/showcase';
import AppHeader from './AppHeader';
import BrandLogo from './BrandLogo';

type Props = {
  data: ShowcaseData;
};

export default function GeoAICatalogue({ data }: Props) {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [fullscreenTitle, setFullscreenTitle] = useState<string>('');

  // Group 16 images by episode (8 episodes, 2 scenarios each)
  const groupedEpisodes = [
    {
      id: '290411124Y000018',
      region: 'Kab. Sikka',
      package: 'NTT-01',
      kind: 'Banjir (Indeks MNDWI)',
      desc: 'Analisis perpotongan genangan banjir terhadap koridor akses faskes rujukan di Sikka.',
    },
    {
      id: '177250424P000119',
      region: 'Kab. Kupang',
      package: 'NTT-03',
      kind: 'Banjir (Indeks MNDWI)',
      desc: 'Simulasi genangan air musiman pada koridor rujukan pesisir dan dataran rendah Kupang.',
    },
    {
      id: '496481024Y000339',
      region: 'Kab. Manggarai',
      package: 'NTT-04',
      kind: 'Longsor (Indeks dNDVI)',
      desc: 'Perubahan vegetasi lereng curam di koridor pegunungan Manggarai sebagai proksi risiko longsor.',
    },
    {
      id: '192850524Y000219',
      region: 'Kab. Manggarai Timur',
      package: 'NTT-06',
      kind: 'Longsor (Indeks dNDVI)',
      desc: 'Deteksi perbedaan tutupan vegetasi di area berbukit jalur rujukan Manggarai Timur.',
    },
    {
      id: '23120624P000056',
      region: 'Kab. Timor Tengah Selatan',
      package: 'NTT-02',
      kind: 'Kebakaran (Indeks dNBR)',
      desc: 'Indeks kebakaran lahan dan savana kering yang memengaruhi aksesibilitas faskes di TTS.',
    },
    {
      id: '42640724P000004',
      region: 'Kab. Belu',
      package: 'NTT-07',
      kind: 'Kebakaran (Indeks dNBR)',
      desc: 'Area terbakar musiman pada perbatasan Belu yang menjadi konteks pemilihan faskes tujuan.',
    },
    {
      id: '24181024Y000034',
      region: 'Kab. Ende',
      package: 'NTT-05',
      kind: 'Kontrol / Stabil',
      desc: 'Kasus pembanding kondisi stabil tanpa gangguan lingkungan signifikan di Ende.',
    },
    {
      id: '23670224P000184',
      region: 'Kab. Flores Timur',
      package: 'NTT-08',
      kind: 'Kontrol / Stabil',
      desc: 'Kasus kontrol kepulauan dengan konektivitas penyeberangan laut standar Flores Timur.',
    },
  ];

  return (
    <div className="catalogue-container">
      <AppHeader />

      <main className="catalogue-main">
        {/* Header Section */}
        <section className="catalogue-header">
          <div className="catalogue-breadcrumb">
            <Link href="/">Beranda</Link>
            <ChevronRight size={13} />
            <span>Katalog Contoh GeoAI</span>
          </div>

          <div className="catalogue-hero">
            <div className="hero-text">
              <span className="hero-eyebrow">
                <Sparkles size={14} />
                Proof of Concept · Paket 16 Aset NTT v2
              </span>
              <h1>Katalog 8 Contoh Bukti Penginderaan Jauh</h1>
              <p>
                Koleksi 16 aset citra satelit dan overlay indeks analitis sintetis untuk 8 episode rujukan prioritas di NTT.
                Disiapkan untuk mendemonstrasikan bagaimana data geospasial memberikan konteks lingkungan pada rujukan akuntabel.
              </p>
            </div>

            <div className="catalogue-meta-card">
              <strong>Keterbukaan Transparansi Metode</strong>
              <ul>
                <li>
                  <strong>Latar Citra:</strong> EOX Sentinel-2 cloudless annual RGB mosaic 2024 (10–20m).
                </li>
                <li>
                  <strong>Overlay Analitis:</strong> Data sintetis terstandarisasi untuk demonstrasi POC.
                </li>
                <li>
                  <strong>Skenario A &amp; B:</strong> Dua kemungkinan hipotesis analisis spasial alternatif.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 8 Episode Showcase Grid */}
        <section className="catalogue-grid" aria-label="Daftar 8 Episode Contoh GeoAI">
          {groupedEpisodes.map((item, index) => {
            const episodeData = data.episodes.find((e) => e.id === item.id);
            const images = data.geoai.images.filter((img) => String(img.episode) === item.id);
            const scenarioA = images.find((i) => i.scenario === 'A');
            const scenarioB = images.find((i) => i.scenario === 'B');

            return (
              <article key={item.id} className="catalogue-card">
                <div className="card-top">
                  <div className="card-top-left">
                    <span className="pkg-badge">{item.package}</span>
                    <span className="region-badge">{item.region}</span>
                    <span className="kind-badge">{item.kind}</span>
                  </div>
                  <span className="case-num">Contoh {index + 1} dari 8</span>
                </div>

                <div className="card-route-info">
                  <strong>
                    {episodeData?.fromName || 'FKTP Asal'} → {episodeData?.toName || 'FKRTL Tujuan'}
                  </strong>
                  <span className="card-id-sub">
                    ID Episode: <code>{item.id}</code>
                  </span>
                </div>

                <p className="card-desc">{item.desc}</p>

                {/* Two Scenario Previews: A & B */}
                <div className="scenarios-grid">
                  {scenarioA && (
                    <div className="scenario-col">
                      <div className="scenario-thumb-wrap">
                        <Image
                          src={scenarioA.thumbnail}
                          alt={`Thumbnail Skenario A - ${scenarioA.title}`}
                          fill
                          className="scenario-thumb"
                          sizes="(max-width: 768px) 100vw, 300px"
                        />
                        <button
                          type="button"
                          className="zoom-btn"
                          onClick={() => {
                            setFullscreenImage(scenarioA.image);
                            setFullscreenTitle(`${scenarioA.title} - Skenario A`);
                          }}
                          aria-label="Perbesar citra Skenario A"
                        >
                          <Maximize2 size={13} />
                        </button>
                      </div>
                      <div className="scenario-info">
                        <strong>Skenario A</strong>
                        <span>{scenarioA.mode === 'dekat_proksi' ? 'Potong koridor' : 'Di luar koridor'}</span>
                      </div>
                    </div>
                  )}

                  {scenarioB && (
                    <div className="scenario-col">
                      <div className="scenario-thumb-wrap">
                        <Image
                          src={scenarioB.thumbnail}
                          alt={`Thumbnail Skenario B - ${scenarioB.title}`}
                          fill
                          className="scenario-thumb"
                          sizes="(max-width: 768px) 100vw, 300px"
                        />
                        <button
                          type="button"
                          className="zoom-btn"
                          onClick={() => {
                            setFullscreenImage(scenarioB.image);
                            setFullscreenTitle(`${scenarioB.title} - Skenario B`);
                          }}
                          aria-label="Perbesar citra Skenario B"
                        >
                          <Maximize2 size={13} />
                        </button>
                      </div>
                      <div className="scenario-info">
                        <strong>Skenario B</strong>
                        <span>{scenarioB.mode === 'dekat_proksi' ? 'Potong koridor' : 'Di luar koridor'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Link to Investigation */}
                <div className="card-footer">
                  <Link
                    href={`/episode/${item.id}?tab=evidence`}
                    className="open-investigation-cta"
                  >
                    <span>Buka Penelaahan &amp; Overlay Peta</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div
          className="fullscreen-modal"
          role="dialog"
          aria-label="Tampilan penuh citra satelit"
          onClick={() => setFullscreenImage(null)}
        >
          <div
            className="fullscreen-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fullscreen-header">
              <strong>{fullscreenTitle}</strong>
              <button
                type="button"
                className="close-fullscreen"
                onClick={() => setFullscreenImage(null)}
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>
            <div className="fullscreen-image-wrap">
              <Image
                src={fullscreenImage}
                alt={fullscreenTitle}
                fill
                style={{ objectFit: 'contain' }}
                sizes="100vw"
                priority
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
