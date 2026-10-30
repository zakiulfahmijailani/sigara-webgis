# Galeri Ilustrasi Tunggal & Tampilan Analisis Spasial untuk Episode Tinggi

Kebijakan showcase diperbarui pada 30 Oktober 2026 atas arahan pengguna:

- Seluruh episode dengan kategori master `TINGGI_SIM` (364 episode) mendapat tepat **satu hasil analisis/ilustrasi GeoAI utama** (`primaryEvidence`), yaitu item skenario A dari paket stabil v4 yang dipasangkan.
- Episode `SEDANG_SIM` dan `RENDAH_SIM` tidak menampilkan section bukti gambar ini.
- Bagian bukti GeoAI ditampilkan langsung di bawah Sankey / Data Flow pada halaman episode yang sama (tanpa tab tingkat halaman baru).
- Panel analisis menyediakan dua pilihan tampilan lokal:
  1. **Penginderaan Jauh & GeoAI** (default): menampilkan satu gambar utama dari Neon Object Storage, interpretasi analisis, dan detail provenance teknis.
  2. **Analisis Spasial**: menampilkan konteks spasial faskes asal, faskes tujuan terpilih, faskes alternatif terdekat, metrik perbandingan jarak/waktu proksi, dan tautan ke peta interaktif.
- Tidak ada kontrol pemilih skenario A/B, tombol hipotesis alternatif, atau dropdown skenario di antarmuka pengguna.
- Pemilihan gambar bersifat deterministik per ID episode (menggunakan FNV hash stabil `v4-high-risk-demo-v1`) sehingga konsisten saat reload, navigasi, atau filtering.
- Perpindahan antara tab Analisis Spasial dan Penginderaan Jauh tidak mengubah ID episode, gambar terpilih, skor master (`fraudIdx`), atau skor pilar indeks.

## Keterbatasan Raster Poster v4 yang Jujur
- Poster v4 memiliki teks "Skenario A" atau "Skenario B" yang tertanam langsung pada gambar PNG.
- Kontrol dan label skenario telah dihapus dari antarmuka React, alt text, dan lightbox. Namun, teks tertanam pada file PNG lama tetap diakui secara transparan sampai paket poster baru (v5) diunggah.
- Gambar dimuat dari Neon Object Storage melalui route `/api/geoai/evidence/<fileName>?v=<hash>`.

## Integritas Data
- `getEvidenceForEpisode` tetap merupakan lookup sumber asli paket 8 episode.
- `getShowcaseEvidenceForEpisode` menyediakan pemetaan stabil arsip.
- `getPrimaryEvidenceForEpisode` adalah resolver runtime yang mengembalikan tepat satu `primaryEvidence` untuk episode tinggi dan `null` untuk kategori lainnya.
- Jangan mengubah `fraudIdx`, kategori master, `hasGeoAI`, atau skor pilar berdasarkan penempatan ilustrasi.

