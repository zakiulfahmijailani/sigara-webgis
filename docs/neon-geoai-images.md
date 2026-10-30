# Gambar galeri v4 di Neon Object Storage

Migrasi 30 Oktober 2026: 16 PNG v4 (53.303.263 byte) dan katalog JSON disimpan pada proyek Neon `sigara-kupang` / `square-sound-40269045`, cabang `production` / `br-misty-sea-azd874ea`, bucket `sigara-geoai` (`public_read`). Gambar POC memang disajikan pada website publik; bucket hanya dapat ditulis memakai credential/presigned upload yang sah.

Endpoint publik:
`https://br-misty-sea-azd874ea.storage.c-3.ap-southeast-1.aws.neon.tech`

## Alur runtime

1. `geoai-evidence-v4.ts` memasangkan ilustrasi ke episode tinggi sesuai kebijakan showcase.
2. URL gambar dikonversi menjadi `/api/geoai/evidence/<fileName>?v=<16 karakter SHA256>` oleh `geoai-storage.ts`.
3. Route tersebut hanya menerima nama berkas yang tercantum pada registry. Server mengambil byte dari Neon Object Storage, lalu mengalirkannya dengan header cache browser/CDN dan ETag.
4. Route tidak membaca berkas PNG dari `public/` dan tidak memakai fallback lokal ketika Neon gagal. Kegagalan menghasilkan 503 `no-store`, dan UI menawarkan muat ulang.
5. Pengambilan upstream melewati Next fetch cache yang mempunyai batas ukuran kecil. Cache gambar ditempatkan pada respons publik/CDN (`s-maxage=31536000`) dan browser.

Tidak dibutuhkan credential storage di browser atau credential baru pada aplikasi untuk membaca bucket publik ini. Presigned upload hanya digunakan saat migrasi; URL tersebut tidak ditulis ke repo atau digunakan sebagai URL gambar permanen.

## Registry dan versi objek

`src/data/ntt-geoai-storage.json` memuat endpoint, bucket, object key, ukuran, dan SHA256. Kunci PNG berbentuk `v4/<SHA256>/<fileName>`, sehingga versi lama tidak ditimpa. Jika gambar diperbarui, unggah dengan hash baru dan perbarui registry; URL aplikasi juga berubah melalui parameter versi.

`catalogObjectKey` menunjuk katalog asli beserta metadata lokasi objek pada bucket Neon yang sama. Katalog menyimpan asal skenario, ID episode sumber, versi ilustrasi, dan URL aplikasi. File sumber pada workspace tetap dipertahankan sebagai arsip, tetapi galeri runtime menggunakan Neon.

`NEON_GEOAI_STORAGE_ENDPOINT` adalah override server opsional untuk cabang lain. Default-nya endpoint production yang sudah diperiksa. Endpoint harus berupa HTTPS storage Neon yang sah, tanpa userinfo/path/query tambahan.

V2 berbeda fungsi: overlay raster sintetis dan aset latar lama belum dipindahkan oleh pekerjaan ini. Migrasi ini mencakup seluruh 16 poster v4 yang diminta pengguna.

## Verifikasi dan pengulangan unggahan

Satu gambar diuji di cabang terpisah `sigara-geoai-storage-20261030` / `br-falling-violet-aznnmqkv` sebelum unggahan production. Cabang tersebut dibuat tanpa compute Postgres.

Semua 16 PNG production dibaca kembali dan SHA256 serta jumlah byte diperiksa terhadap sumber. Total byte PNG adalah 53.303.263. Katalog juga diperiksa dengan cara yang sama. Tidak ada perubahan master rujukan atau skema SQL.

`scripts/upload-geoai-neon.mjs` menerima task JSON pada stdin dengan URL unggah bertanda tangan yang masih berlaku. Script memeriksa host, hash sumber, dan hash hasil download; log tidak menampilkan signed URL. Unggahan dengan object key yang sudah berisi konten sama dapat diulang tanpa menimpa data.

`tests/geoai-neon-storage.test.ts` mencakup URL whitelist, versi, streaming, cache/304, HEAD, serta kegagalan storage tanpa fallback lokal. Galeri tetap hanya untuk kategori master tinggi; pemakaian ulang gambar tidak menjadi hasil analisis baru atau mengubah skor.

Laporan migrasi dan pemeriksaan runtime disimpan pada workspace penelitian di `output/neon_geoai_storage_2026-10-30/`. Push Git dan deploy aplikasi adalah langkah terpisah; unggahan bucket sudah dilakukan, sedangkan aplikasi aktif memerlukan build dari kode terbaru.
