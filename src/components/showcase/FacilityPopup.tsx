'use client';
import { formatMinutes, formatKm, type Episode, type ShowcaseData } from '@/lib/showcase';

export type MapPoint = {
  id: string;
  nama?: string;
  peran?: string;
  kelompok?: string;
  kabkota?: string;
  lon: number;
  lat: number;
  peranVerif?: boolean;
  existVerif?: boolean;
};

export default function FacilityPopup({
  point,
  data,
  selected,
  episodes,
  onOpenPoint,
}: {
  point: MapPoint;
  data: ShowcaseData;
  selected: Episode | null;
  episodes: Episode[];
  onOpenPoint: (point: MapPoint) => void;
}) {
  const isOrigin = selected?.fromId === point.id;
  const isDestination = selected?.toId === point.id;
  const isAlternative = selected?.altId === point.id;

  let roleLabel = 'Fasilitas Referensi NTT';
  if (isOrigin) {
    roleLabel = '📍 Titik Asal Rujukan (FKTP)';
  } else if (isDestination) {
    roleLabel = '🏥 Fasilitas Tujuan Terpilih';
  } else if (isAlternative) {
    roleLabel = '🎯 Alternatif Layak Terdekat (Dalam Cakupan)';
  } else if (point.peran === 'RS' || point.kelompok === 'RS') {
    roleLabel = 'Rumah Sakit Rujukan';
  } else if (point.peran === 'FKTP') {
    roleLabel = 'Fasilitas Tingkat Pertama';
  }

  // Count related episodes
  const relatedAsOrigin = episodes.filter((e) => e.fromId === point.id).length;
  const relatedAsDestination = episodes.filter((e) => e.toId === point.id).length;

  return (
    <section className="facility-popup" aria-label={`Informasi fasilitas ${point.nama || point.id}`}>
      <span className="facility-popup-source">KATALOG FASILITAS NTT · 879 REFERENSI</span>
      <h3>{point.nama || point.id}</h3>
      <p className="facility-popup-role">{roleLabel}</p>

      <dl>
        <div>
          <dt>ID Fasilitas</dt>
          <dd><code>{point.id}</code></dd>
        </div>
        <div>
          <dt>Kabupaten / Kota</dt>
          <dd>{point.kabkota || 'Wilayah NTT'}</dd>
        </div>
        <div>
          <dt>Kelompok &amp; Peran</dt>
          <dd>
            {point.kelompok || 'UMUM'} · {point.peran || 'Faskes'}
            {point.peranVerif ? ' (Peran terverifikasi)' : ''}
          </dd>
        </div>
        <div>
          <dt>Koordinat</dt>
          <dd>
            {point.lat.toFixed(5)}, {point.lon.toFixed(5)}
          </dd>
        </div>
        <div>
          <dt>Episode Terkait (Filter Aktif)</dt>
          <dd>
            {relatedAsOrigin} sebagai asal · {relatedAsDestination} sebagai tujuan
          </dd>
        </div>

        {selected && (isDestination || isAlternative) && (
          <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #dbe5d8' }}>
            <dt>Metrik Akses dari {selected.fromName}</dt>
            <dd>
              {isDestination && (
                <>
                  Waktu tempuh proksi: <strong>{formatMinutes(selected.timeMin)}</strong>
                  {selected.distM != null && ` (${formatKm(selected.distM)})`}
                </>
              )}
              {isAlternative && (
                <>
                  Waktu tempuh proksi: <strong>{formatMinutes(selected.altTimeMin)}</strong>
                  {selected.diffMin != null && ` (Hemat ${formatMinutes(selected.diffMin)})`}
                </>
              )}
            </dd>
          </div>
        )}
      </dl>

      <p className="facility-popup-note">
        Katalog titik fasilitas NTT didasarkan pada dataset referensi faskes simulasi (879 titik). Jarak dan waktu menggunakan proksi akses geografis, bukan rute jalan langsung terverifikasi.
      </p>
    </section>
  );
}
