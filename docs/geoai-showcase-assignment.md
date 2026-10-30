# Galeri ilustrasi acak untuk episode tinggi

Kebijakan showcase diperbarui pada 30 Oktober 2026 atas arahan pengguna:

- Seluruh episode dengan kategori master `TINGGI_SIM` mendapat pasangan ilustrasi A/B dari 16 PNG v4 yang sudah tersedia.
- Episode `SEDANG_SIM` dan `RENDAH_SIM` tidak menampilkan section galeri.
- Delapan pasangan asal dipertahankan; episode tinggi lainnya memakai pilihan pseudoacak berdasarkan ID dan seed versi `v4-high-risk-demo-v1`.
- Pemilihan tetap sama saat halaman dimuat ulang dan tidak bergantung pada urutan daftar/filter.
- A dan B selalu berasal dari paket sumber yang sama.

`getEvidenceForEpisode` tetap merupakan lookup sumber asli. `getShowcaseEvidenceForEpisode` adalah pemetaan tampilan demonstrasi yang terpisah dan memeriksa kategori episode.

Jangan mengubah `fraudIdx`, kategori, `hasGeoAI`, statistik raster v2, atau hasil indeks berdasarkan pemetaan gambar. Galeri contoh bukan bukti bahwa analisis baru sudah dijalankan untuk 364 episode.

Poster memiliki ID, wilayah, dan tanggal skenario asal yang tertanam pada gambar. Pemetaan tidak mengedit poster atau mengganti metadata asalnya. Pada pemakaian ulang, UI menjelaskan ID episode yang dibuka dan ID episode sumber ilustrasi; wilayah/tanggal pada metadata diberi label sebagai milik skenario gambar.

Aturan ini menggantikan ketentuan lama yang membatasi tampilan v4 pada delapan episode asal. Angka delapan masih benar untuk jumlah paket asal dan ketersediaan raster analitis v2, bukan batas cakupan galeri demonstrasi v4.

Pengujian di `tests/geoai-v4-evidence.test.ts` mencakup seluruh snapshot: 364 tinggi mendapat dua skenario, sedang/rendah tidak mendapat galeri, semua delapan paket dipakai, pasangan dan provenance tetap utuh, serta data master tidak dimutasi.
