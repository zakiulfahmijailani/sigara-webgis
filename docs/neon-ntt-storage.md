# Penyimpanan aktif SIGARA NTT di Neon

Migrasi 28 Oktober 2026. Proyek `sigara-kupang` (`square-sound-40269045`), database `sigara_kupang`, schema `sigara`. Nama proyek/database lama dipertahankan agar koneksi Vercel yang sudah terpasang tetap bekerja.

## Data yang dipindahkan

| Objek | Isi |
|---|---|
| `sigara.tabel_utama_rujukan_ntt_2024` | Tampilan bertipe 206 kolom asli, 10.776 baris |
| `sigara.ntt_master_rujukan` | Penyimpanan master per baris, dengan ID episode dan kunjungan yang dapat diindeks |
| `sigara.ntt_episodes` | 3.683 episode |
| `sigara.ntt_visits` | 10.776 kunjungan, indeks episode dan urutan |
| `sigara.ntt_facilities` | 879 referensi fasilitas |
| `sigara.ntt_resources` | Ringkasan, geometri provinsi/kabupaten, manifest GeoAI |
| `sigara.ntt_source_files` | Salinan byte Parquet asli untuk pemulihan utuh |
| `sigara.ntt_datasets` | Provenans, hash sumber, daftar 206 kolom dan tipe asli, status publikasi |
| `sigara.showcase_snapshots` | Snapshot kompatibilitas `ntt-showcase-v2` untuk API lama |

Cakupan data adalah subset NTT lama yang sudah dipakai platform, bukan seluruh master nasional 1.001.306 baris dan bukan file hasil pengisian nama yang baru di Downloads. Peserta tetap 2.329; distribusi episode tetap tinggi 364, sedang 23, rendah 3.296. Data demo Kupang lama dipertahankan.

Master sumber: `output/master_dummy_ntt/20261024_201204_812821/tabel_utama_rujukan_ntt_2024_dummy.parquet`. SHA256 `16e8c61edd46dec13b47b93ebf42c3eeea5fb601c6b89bcbc87e03ed7d2b4936`. Salinan Parquet diperiksa byte demi byte melalui checksum sebelum publikasi. Penyimpanan JSONB menyediakan nilai yang dapat dikueri; file Parquet menyimpan representasi asli termasuk ketelitian timestamp. Tampilan SQL mengubahnya menjadi tipe PostgreSQL yang sesuai.

## Pembacaan website

- `/api/showcase` membaca snapshot NTT dari Neon dan memerlukan status dataset `ready`.
- `?compact=1` menyajikan representasi kolom JSON yang dikembalikan menjadi objek episode oleh loader. Semua nilai, kategori, dan koordinat dipertahankan.
- `?episodeId=...` mengambil satu episode dengan konteks peta, bukan semua episode. Parameter SQL selalu terikat.
- `/api/showcase/visits?episodeId=...` membaca kunjungan dari tabel Neon saat diperlukan.
- Kegagalan database menghasilkan 503 dengan `no-store`, bukan data lokal yang diam-diam menggantikan database.
- Snapshot beranda masih berisi seluruh indeks episode NTT untuk clustering/filter peta yang ada. Ini bukan pagination server untuk master nasional. Tidak ada endpoint publik untuk tabel master 206 kolom atau Parquet sumber.
- Poster galeri GeoAI v4 dipindahkan ke Neon Object Storage pada 30 Oktober 2026; route gambar mengambil byte dari Neon dengan cache browser/CDN. Lihat `docs/neon-geoai-images.md`. Overlay raster v2 tetap merupakan aset aplikasi. JSON data episode di `src/data` menjadi fixture/input impor; registry lokasi objek v4 dipakai runtime tanpa memuat PNG ke bundle.

Role aplikasi hanya diberi SELECT pada tabel sajian. Role itu tidak dapat menulis episode, membaca master mentah, atau mengunduh Parquet sumber. Credential owner hanya untuk migrasi; credential tersebut tidak dipakai website.

## Impor dan pemeriksaan

Skema tersimpan pada `scripts/migrations/001-ntt-neon.sql` dan `002-ntt-master-view.sql`. Siapkan `master.ndjson` dan `master-manifest.json` dari sumber Parquet dengan `tmp/export_ntt_master_neon.py` pada workspace penelitian. Siapkan environment file yang diabaikan Git berisi DATABASE_URL owner untuk cabang uji.

```sh
node --env-file=.env.neon-test scripts/import-ntt-neon.mjs
node --env-file=.env.neon-test scripts/publish-ntt-master-view.mjs
```

Setelah hasil uji lulus, jalankan kedua perintah terhadap environment produksi. Importer tidak mengganti dataset ready dengan sumber berbeda. Publikasi snapshot dan penanda ready berlangsung dalam satu transaksi setelah pemeriksaan integritas. Impor yang belum selesai dapat diulang sebelum publikasi. Role owner dan nilai koneksi tidak boleh ditulis ke dokumentasi, Git, atau keluaran log.

Validasi: jumlah baris, peserta, kategori, hubungan episode/kunjungan, kesamaan seluruh payload episode/fasilitas, sampel 37 episode kunjungan, salinan Parquet utuh, dan hak role reader. Ukuran database sesudah impor sekitar 106 MB pada saat migrasi. Cabang uji `sigara-ntt-migration-20261028` tetap tersedia untuk pemeriksaan.

Pemeriksaan aplikasi:

```sh
npm test
npm run typecheck
npm run build
node scripts/test-neon-api.mjs
node scripts/test-map-ux.cjs
```

Set `SIGARA_TEST_URL` untuk server target; laporan API dapat disimpan melalui `SIGARA_REPORT`. Hasil uji contoh: JSON biasa 3.794.497 byte, transport kompak 2.623.335 byte. Setelah gzip: 371.879 menjadi 298.460 byte, berkurang sekitar 20%. Konteks satu episode sekitar 669 KB sebelum kompresi. Ukuran dapat berubah jika data atau urutan properti berubah.
