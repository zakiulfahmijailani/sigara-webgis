# SIGARA — showcase Agentic GeoAI Kota Kupang

Ruang pemeriksaan rujukan dengan daftar kasus di kiri, peta di tengah, dan penjelasan kasus di kanan. Fork ini dikelola terpisah dari aplikasi mahasiswa.

## Cakupan demo

- Hanya Kota Kupang (polygon GADM 4.1): 6 FKTP dan 4 RS sintetis; 94 fasilitas publik OpenStreetMap sebagai referensi.
- 1.080 kasus sintetis: **25 prioritas pemeriksaan**, **52 perlu kelengkapan data**, **1.003 tidak diprioritaskan**. Angka dihitung dari kasus.
- Data dasar setelah penyaringan kota menghasilkan 0/52/1.028. Sebanyak 25 kasus disusun ulang menjadi skenario prioritas, ditandai `showcaseAdjusted` dan daftar ID pada metadata. Tabel data dasar di Neon dipertahankan.
- Tidak memuat data pasien nyata. Merah berarti prioritas pemeriksaan, bukan penetapan fraud atau keputusan layanan.
- Orchestrator dan enam agen merupakan **simulasi**. LLM, RAG, dan pemeriksaan berkala belum aktif.

## Metode

Rute dan waktu model berasal dari Dijkstra pada jaringan jalan OSM; bukan lalu lintas langsung. Aplikasi menyaring RS berdasarkan layanan, kapasitas sintetis, dan kelengkapan data, lalu menerapkan aturan deterministik.

Merah memerlukan ketiga syarat sekaligus: tambahan waktu minimal 8 menit, rasio minimal 1,5 kali, dan minimal 2 alternatif layak lebih cepat, tanpa alasan khusus terverifikasi. Data tidak cukup menjadi oranye. Alasan terdokumentasi dapat menjelaskan pilihan tujuan jika data penilaian lengkap. Aturan berada di `src/lib/showcase.ts`.

SIGARA Index adalah pengelompokan prioritas, bukan skor berbobot 0–100. Analisis mendalam memperlihatkan nilai, ambang, hasil aturan, alternatif, bukti sintetis, dan alur data. Tidak ada bobot atau kontribusi AI yang dikarang.

## Menjalankan

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
```

Next.js 15, React 19, TypeScript, MapLibre GL, OpenFreeMap Positron. Basemap tidak memerlukan API key; ketersediaan layanan eksternal tidak dijamin. Geometri lokal tersedia sebagai fallback dengan atribusi sumber.

## Neon

`GET /api/showcase` membaca `kupang-showcase-v1` dari `sigara.showcase_snapshots`. Tetapkan `DATABASE_URL` server Vercel menggunakan role yang hanya membaca tabel showcase. Jangan gunakan `NEXT_PUBLIC_` atau menyimpan kredensial di Git.

Jika Neon tidak dikonfigurasi atau tidak merespons, endpoint memakai `src/data/showcase.json`. Footer menyebut sumber yang digunakan.

Impor: `node scripts/import-showcase.mjs` dengan `DATABASE_URL` administratif di lingkungan lokal aman. Script memperbarui tabel snapshot terpisah, tidak mengubah tabel data dasar. Jangan gunakan role administratif untuk aplikasi.

Bangun ulang snapshot: `python scripts/build-showcase.py /path/to/kupang-city-package.json`. Paket dasar yang sudah disaring berasal dari persiapan dataset proyek dan tidak disertakan dalam Git. Snapshot mencatat hash sumber, ID skenario yang diubah, tanggal data, dan aturan.

Jalan/fasilitas publik: OpenStreetMap. Batas: GADM 4.1. Periksa ketentuan sumber sebelum penggunaan di luar demo penelitian.

## Publikasi

Fork: https://github.com/zakiulfahmijailani/sigara-webgis

Vercel: https://sigara-ntt.vercel.app/ — cabang produksi `main`.

Modul nasional lama dipertahankan sebagai arsip repository; halaman utama hanya menampilkan showcase Kota Kupang.
