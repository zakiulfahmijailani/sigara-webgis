# SIGARA — Platform Agentic GeoAI Rujukan Akuntabel Provinsi NTT

Showcase platform penelaahan rujukan akuntabel berbasis kecerdasan geospasial (GeoAI) dan penginderaan jauh untuk seluruh **Provinsi Nusa Tenggara Timur (NTT)**, Indonesia, dalam rangka **BPJS Healthkathon 2026**.

## 1. Cakupan Data & Master Rujukan NTT

- **Wilayah**: Seluruh 21 Kabupaten/Kota di Kepulauan Nusa Tenggara Timur (Flores, Sumba, Timor Barat, Alor, Lembata, Rote Ndao, Sabu Raijua) menggunakan batas resmi GADM 4.1.
- **Total Master Rujukan 2024**:
  - **10.776 kunjungan** rujukan tingkat lanjut (FKRTL).
  - **3.683 episode rujukan unik** (`id_kelompok_rujukan_fktp` bertipe string).
  - **2.329 peserta unik** (`id_peserta_sumber`).
  - **879 fasilitas kesehatan referensi NTT** berkoordinat valid (185 faskes asal unik, 387 faskes tujuan unik, 100% terekonsiliasi).
- **Distribusi Kategori Prioritas Simulasi**:
  - **Indikasi tinggi (simulasi)**: 364 episode (926 kunjungan).
  - **Indikasi sedang (simulasi)**: 23 episode (49 kunjungan).
  - **Indikasi rendah (simulasi)**: 3.296 episode (9.801 kunjungan).
  - *Catatan*: Warna dan label merupakan prioritas pemeriksaan penelaahan (review priority) dalam simulasi POC, bukan penetapan kecurangan (fraud) terbukti.
- **Alternatif Luar Wilayah**: Terdapat 10 episode rujukan yang mempertahankan fasilitas alternatif terdekat di provinsi tetangga (NTB) dari hasil perhitungan upstream; faskes tersebut ditandai dengan peringatan `Alternatif di luar cakupan NTT (NTB)` dan tidak dipetakan sebagai titik NTT.

## 2. Integrasi Bukti Penginderaan Jauh & GeoAI (Paket 16 Peta v2)

- **16 Aset Ilustrasi & Analisis**:
  - 4 Skenario Banjir (Indeks MNDWI)
  - 4 Skenario Kandidat Longsor (Indeks dNDVI + Filter Lereng)
  - 4 Skenario Bekas Kebakaran (Indeks dNBR)
  - 4 Skenario Kontrol / Stabil & Insufficient Data
- **8 Episode Demonstrasi Terpilih**:
  1. `290411124Y000018` (Sikka / NTT-01) — Banjir
  2. `177250424P000119` (Kupang / NTT-03) — Banjir
  3. `496481024Y000339` (Manggarai / NTT-04) — Kandidat Longsor
  4. `192850524Y000219` (Manggarai Timur / NTT-06) — Kandidat Longsor
  5. `23120624P000056` (Timor Tengah Selatan / NTT-02) — Bekas Kebakaran
  6. `42640724P000004` (Belu / NTT-07) — Bekas Kebakaran
  7. `24181024Y000034` (Ende / NTT-05) — Kontrol Stabil
  8. `23670224P000184` (Flores Timur / NTT-08) — Kontrol Stabil
- **Fitur Viewer GeoAI**:
  - Pemilih skenario ganda (Skenario A: Potong Proksi vs Skenario B: Di Luar Proksi).
  - Penampil gambar resolusi penuh (1920 × 1340 px) modal dialog.
  - Overlay raster analitis transparan (`overlay/*.png`) tergeoreferensi langsung pada peta MapLibre menggunakan koordinat 4 sudut WGS84 (`nearest-neighbor` resampling) dengan kontrol opasitas (slider) dan saklar lapisan.
  - Lapisan konteks satelit Sentinel-2 2024 cloudless crop (`latar/*.png`).
  - Penjelasan rumus ilmiah, aturan klasifikasi, dan sitasi jurnal (Kulk et al. 2023, Notti et al. 2023, Picos et al. 2019).
  - Status jujur untuk 3.675 episode lainnya: *Belum ada ilustrasi GeoAI untuk episode ini*.

## 3. Kejujuran Ilmiah (Truthful Scientific Disclosure)

- Latar satelit menggunakan mosaik tahunan bebas awan EOX Sentinel-2 RGB tahun 2024 (`https://s2maps.eu`, CC BY-NC-SA 4.0).
- Lapisan indeks dan pita numerik adalah data raster **SINTETIS** untuk pembuktian konsep (POC). Tidak ada deteksi satelit operasional langsung yang dijalankan.
- Metrik jarak dan waktu pada master menggunakan proksi akses geografis (`metode_jarak`, `metode_waktu`), ditampilkan di peta sebagai `Garis OD / proksi akses`. Garis yang melintasi laut merupakan representasi relasi OD, bukan klaim jalan raya atau feri operasional.

## 4. Menjalankan Aplikasi & Pengujian

### Prasyarat
- Node.js 18+ (direkomendasikan v20+)
- Python 3.10+ (dengan pandas, pyarrow)

### Membangun Data (ETL Reproduksibel)
```sh
python scripts/build-ntt-showcase.py
```
Skrip ini memproses master parquet, katalog faskes, GADM batas wilayah, dan paket citra GeoAI, menghasilkan dataset siap saji di `src/data/` serta melakukan 15 pemeriksaan otomatis (acceptance checks).

### Menjalankan Server & Validasi
```sh
npm install
npm test            # Menjalankan 8 pengujian otomatis
npm run typecheck   # Validasi tipe TypeScript
npm run build       # Membangun bundel produksi Next.js
npm run dev         # Menjalankan server pengembang lokal di http://localhost:3000
```

## 5. Konfigurasi API & Sumber Data

- Endpoint `GET /api/showcase` melayani kontrak versi `ntt-showcase-v2`.
- Jika `DATABASE_URL` tersedia, aplikasi mencoba memuat snapshot `ntt-showcase-v2` dari Neon Serverless Postgres. Jika tidak tersedia atau tidak cocok, aplikasi secara otomatis menggunakan snapshot lokal terverifikasi di `src/data/`.
- Endpoint `GET /api/showcase/visits?episodeId=...` memuat lini masa kunjungan secara on-demand sehingga ukuran payload halaman awal tetap sangat ringan (First Load JS: ~124 kB).

## 6. Repositori & Publikasi

- Repositori: https://github.com/zakiulfahmijailani/sigara-webgis
- Deployment: https://sigara-ntt.vercel.app/
