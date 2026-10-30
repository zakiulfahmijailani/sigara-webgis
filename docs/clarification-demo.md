# Klarifikasi dua arah SIGARA — Simulasi POC

Seluruh kontak, pengiriman, jawaban, dan penjelasan tambahan adalah dummy. Tidak ada email, WhatsApp, portal stakeholder, atau panggilan AI eksternal. Data episode dan resolver gambar Neon yang sudah ada tetap digunakan. Percakapan tidak mengubah indeks awal, kategori, atau hasil model.

## Menjalankan demo

Buka Peta NTT, cari ID episode pada daftar Episode, lalu masuk detail. Panel Klarifikasi & Tindak Lanjut terletak setelah Sankey dan pemeriksaan/bukti GeoAI.

1. **Jawaban lengkap** — contoh episode Sikka `290411124Y000018`. Pilih Alur 1, Buat Laporan & Mulai Demo Klarifikasi, baca draf, Simulasikan Pengiriman, lalu Simulasikan Balasan Faskes. Tinjau ringkasan, pilih Tinjau & Tutup Kasus, pilih keputusan dan isi catatan wajib.
2. **Tanya-jawab bertahap** — contoh Kupang `177250424P000119`. Pilih Alur 2 dan kirim permintaan. Simulasikan balasan (pertanyaan faskes), Jawab Pertanyaan Faskes, simulasikan balasan berikutnya (belum lengkap), lalu Kirim Pertanyaan Lanjutan. Balasan berikutnya melengkapi ringkasan untuk ditutup petugas.
3. **Pengingat dan eskalasi** — contoh Manggarai `496481024Y000339`. Pilih Alur 3 dan kirim permintaan. Tekan Majukan ke Tenggat Berikutnya tiga kali: pengingat pertama, pengingat kedua, lalu eskalasi. Petugas dapat langsung menutup dengan catatan, atau Simulasikan Balasan Terlambat sebelum menutup.

Episode awal sedang/rendah atau tanpa indeks tidak mempunyai kontrol pembukaan kasus. Pemilihan fixture hanya sebelum kasus dimulai. Reset Kasus meminta konfirmasi, menghapus percakapan episode terpilih dan mengembalikan pilihan alur; laporan yang sudah dibuat tetap tersimpan sebagai arsip versi demo. Kasus lain, dataset, dan gambar tidak dihapus.

## Waktu dan laporan

Satu jam demo bersama dimulai saat kasus pertama dibuat. Batas jawaban dua hari simulasi (48 jam), maksimum dua pengingat per putaran. Setelah dua hari tambahan dari pengingat kedua, kasus dieskalasi; tidak otomatis ditutup. Majukan 1 Hari atau ke Tenggat mengevaluasi semua kasus aktif secara berurutan. Refresh tidak memajukan jam. Balasan menghentikan tenggat permintaan yang dijawab, dan pertanyaan berikutnya mempunyai tenggat baru.

Lampiran pesan membuka laporan awal yang disimpan saat kasus dimulai. Tombol Buka Laporan Klarifikasi Terbaru dan drawer laporan membuka snapshot terbaru termasuk ringkasan/status/catatan petugas. Versi lama tetap tersimpan. Cetak / Simpan PDF membuka dialog browser; aplikasi tidak otomatis menyimpan atau mengirim PDF.

## Dashboard dan penyimpanan

Empat kartu tetap dipertahankan. Episode Ditelaah menghitung pemeriksaan demo yang diselesaikan melalui Telaah 3 Episode; gambar tersedia tidak dihitung sebagai pemeriksaan. Prioritas baru nol karena belum ada baseline. Laporan menghitung episode unik, bukan jumlah versi. Notifikasi menghitung hanya pesan outbound berstatus terkirim simulasi, termasuk pengingat dan jawaban agen.

Chip Menunggu menghitung kasus awaiting_response; Balasan diterima menghitung kasus unik yang pernah mendapat inbound, termasuk yang ditutup; Perlu tindak lanjut menghitung eskalasi yang belum ditutup. Klik chip/notifikasi membuka rincian dan tautan percakapan.

State disimpan lokal per browser: `sigara-agent-activity-v4` (versi 4.0.0), `sigara-clarification-cases-v1`, dan `sigara-demo-clock-v1`. Event browser menyinkronkan komponen dan tab. Riwayat v3 tetap disimpan terpisah, tidak diimpor sebagai fakta operasional. Jika penyimpanan diblokir, demo memakai memori sementara dan panel menjelaskan bahwa data hilang setelah refresh. Ini bukan sistem multiuser; penyuntingan serentak pada kasus yang sama memakai penulisan terakhir.

## Pemeriksaan

- `npm run typecheck`
- `npm test` — termasuk eligibility, transisi, tenggat, eskalasi, balasan terlambat, relasi thread, deduplikasi, statistik, penyimpanan/reset dan indeks master.
- `npm run build` (jalankan setelah server dev dihentikan).
- Jalankan server di port 3107, kemudian `node scripts/test-clarification-ui.cjs`. Gunakan `SIGARA_TEST_URL` untuk alamat lain dan `PLAYWRIGHT_MODULE` untuk lokasi Playwright di komputer lain. Tes menggunakan Chrome headless.

Screenshot pengujian tersimpan di `test-results/clarification-demo/`: dashboard awal/akhir, thread tiga alur, pertanyaan lanjutan, eskalasi, penutupan, laporan, dan tampilan mobile. Folder hasil uji tidak masuk Git.

Respons terbatas pada fixture deterministik, bukan chat bebas. Gambar generatif adalah ilustrasi dan bukan verifikasi independen atas pernyataan dummy stakeholder.

## Hasil verifikasi 31 Oktober 2026

Pemeriksaan tipe dan build produksi lulus. Seluruh 60 tes otomatis lulus. Uji Chrome terhadap build produksi lokal menyelesaikan ketiga fixture sampai penutupan, memeriksa laporan snapshot, refresh tanpa pesan baru, total tiga laporan dan tujuh pesan outbound, daftar tiga kasus yang pernah menerima balasan, stylesheet cetak, serta panel mobile 390 px. Reset kasus Kupang disinkronkan ke dashboard pada tab lain (pesan turun dari tujuh menjadi empat), tanpa menghapus dua kasus lain. Tidak ada request ke provider pengiriman/AI yang terdeteksi. Screenshot tersimpan di folder hasil uji di atas. Penyimpanan PDF melalui dialog dan deployment production belum dilakukan.

Audit lanjutan sebelum penggabungan ke main: pengingat menyebut ID kasus, ID permintaan, dan putaran; balasan parsial mengikuti nomor putaran permintaan; fallback memori tetap membaca perubahan terbaru jika penulisan storage gagal sementara nilai lama masih dapat dibaca. Pemeriksaan tipe dan seluruh 61 tes lulus, termasuk regresi ketiga detail tersebut.
