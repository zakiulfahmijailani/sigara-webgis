# Metodologi SIGARA Index — Penelaahan Akuntabilitas Rujukan

Dokumen ini mendokumentasikan metodologi SIGARA Index, integrasi delapan sumber data, empat pilar penelaahan, rekonsiliasi model master lama, serta spesifikasi model multipilar demonstrasi (v2).

---

## 1. Tujuan SIGARA Index

SIGARA Index adalah sistem pendukung keputusan (decision support system) untuk membantu verifikator BPJS Kesehatan menelaah akuntabilitas episode rujukan dari Fasilitas Kesehatan Tingkat Pertama (FKTP) ke Fasilitas Kesehatan Rujukan Tingkat Lanjutan (FKRTL).

**Prinsip Dasar:**
- SIGARA Index adalah **prioritas penelaahan**, bukan probabilitas atau penetapan kecurangan (fraud).
- Penetapan kecurangan membutuhkan telaah klinis dan konfirmasi administratif faktual.
- Satuan skor berskala 0 hingga 100 dengan arah konsisten: **semakin tinggi skor = semakin perlu ditelaah kewajaran rujukannya**.

---

## 2. Struktur Aliran Data: Delapan Sumber Menuju Empat Pilar

```
[Sumber Data]            [Variabel Turunan]                           [Pilar Penelaahan]                [Hasil]
1. Sampel BPJS        ─→ Diagnosis / poli (Kebutuhan)              ─→ 1. Kesesuaian Layanan          ─┐
2. Pengayaan SIGARA   ─→ Kapasitas & pembenaran skenario           ─→ 2. Pola & Pembenaran Rujukan   ─┼─→ SIGARA Index
3. ESA / Copernicus   ─→ MNDWI, ΔNDVI, ΔNBR                        ─→ 3. GeoAI & Kondisi Lingkungan  ─┤   (per episode)
4. OpenStreetMap      ─→ Waktu tempuh, selisih & rasio             ─→ 4. Akses Geografis             ─┘
5. BIG / DEMNAS       ─→ Elevasi & lereng medan fisik
6. Kemenkes           ─→ Kelayakan fasilitas (ASPAK/SISDMK)
7. BNPB / InaRISK     ─→ Kerawanan bencana latar belakang
8. BPS / Podes        ─→ Aksesibilitas wilayah & transportasi
```

### Delapan Entitas Sumber Data

| No | Sumber Data | Variabel Turunan Utama | Pilar Tujuan | Status Integrasi |
|:---|:---|:---|:---|:---|
| 1 | **Sampel BPJS Kesehatan** | Diagnosis, poli, riwayat episode | Kesesuaian layanan; Pola rujukan | Tersedia dalam Snapshot 2024 |
| 2 | **Pengayaan sintetis SIGARA** | Kapasitas skenario, alasan rujukan | Kesesuaian layanan; Pola rujukan | Simulasi Terpasang |
| 3 | **ESA / Copernicus via Earth Engine** | MNDWI genangan, ΔNDVI vegetasi, ΔNBR kebakaran | GeoAI & kondisi lingkungan | Demo POC (8 episode, 16 citra) |
| 4 | **OpenStreetMap** | Estimasi jarak jalan, selisih & rasio waktu | Akses geografis & keterjangkauan | Model Proksi Terpasang |
| 5 | **BIG / DEMNAS** | Elevasi dan lereng medan | GeoAI & kondisi lingkungan | Rencana Integrasi |
| 6 | **Kemenkes (RS Online / ASPAK / SISDMK)** | Kapasitas tempat tidur, alat medis, SDM spesialis | Kesesuaian layanan | Rencana Integrasi |
| 7 | **BNPB / InaRISK** | Kerawanan bencana wilayah | GeoAI & kondisi lingkungan | Rencana Integrasi |
| 8 | **BPS / Podes** | Akses wilayah dan sarana transportasi pedesaan | Akses geografis & keterjangkauan | Rencana Integrasi |

---

## 3. Rumus Model Master Lama (v1.0)

Implementasi master lama (`output/colab_dummy_nasional/pipeline_dummy.py`, baris 291–306):

```python
excess = max(selisih_waktu_menit, 0)
base = 10.0
time_component = 45.0 * min(excess / 60.0, 1.0)
ratio_component = 35.0 * min(max(rasio_waktu - 1.0, 0) / 2.0, 1.0)
raw_score = base + time_component + ratio_component

if skenario == 'KONTINUITAS_PERAWATAN':
    score = min(raw_score * 0.4, 45.0)
else:
    score = raw_score
```

- **Maksimum teoritis:** 90 poin (10 + 45 + 35) sebelum pengurang.
- **Kategori:**
  - Rendah: `score <= 30.0`
  - Sedang: `30.0 < score <= 60.0`
  - Tinggi: `score > 60.0`
- **Catatan Kejujuran Metodologi:**
  - Pada master v1.0, GeoAI berstatus ilustrasi konteks spasial dan belum memengaruhi rumus master.
  - Jumlah kunjungan (`visitCount`) adalah jumlah kunjungan dalam episode, bukan skor anomali.

---

## 4. Model Multipilar Demonstrasi (v2.0)

Struktur model multipilar menggabungkan empat pilar dengan konfigurasi bobot demonstrasi:

| Pilar | Bobot | Deskripsi Operasional |
|:---|:---:|:---|
| **Kesesuaian Layanan** | 25% (0.25) | Kesesuaian kebutuhan medis pasien dengan faskes tujuan vs alternatif |
| **Pola & Pembenaran Rujukan** | 15% (0.15) | Pola rujukan berulang dan pembenaran klinis/skenario |
| **GeoAI & Kondisi Lingkungan** | 35% (0.35) | Konfirmasi satelit atas rintangan fisik jalan menuju alternatif |
| **Akses Geografis & Keterjangkauan**| 25% (0.25) | Selisih waktu tempuh dan rasio akses jalan raya |
| **Total** | **100% (1.00)** | — |

### Formula Perhitungan
$$\text{SIGARA Index} = \sum_{p \in \{\text{layanan, pola, geoai, akses}\}} (\text{bobot}_p \times \text{skor pilar}_p)$$

### Aturan Penanganan Data Kurang
- Bila salah satu pilar wajib belum memiliki data pengukuran yang valid, total skor v2 berstatus **Belum dapat dihitung (`null`)**.
- Sistem **tidak mengisikan nilai nol (0)** atau menormalisasi ulang bobot secara diam-diam.
- Status data hilang dibedakan secara tegas dari skor risiko rendah.

---

## 5. GeoAI: Pengukuran dan Arah Penilaian

GeoAI bukan sekadar label "ada citra" atau penambah kecurigaan otomatis. Evaluasi GeoAI mengikuti 4 lapis:
1. **Pengukuran Spektral:** MNDWI > 0.15 (genangan air baru), ΔNDVI < -0.15 (gangguan vegetasi / kandidat longsor), ΔNBR > 0.10 (kandidat kebakaran).
2. **Paparan Akses:** Perpotongan kandidat gangguan dengan koridor rute alternatif (`nearProxyIntersection`).
3. **Interpretasi Penelaahan:** Jika jalur menuju alternatif terdekat terputus oleh bencana alam, keputusan merujuk ke RS tujuan yang lebih jauh adalah **wajar dan dapat dibenarkan**. Hal ini **mengurangi** skor ketidakselarasan rujukan pada pilar GeoAI.
4. **Kualitas Data:** Ketiadaan deteksi aktual (`noRealDetection: true`) dan batas cakupan spasial dicatat secara transparan.
