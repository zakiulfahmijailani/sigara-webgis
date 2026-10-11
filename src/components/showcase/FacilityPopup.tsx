import { minutes, type Assessment, type Referral, type ShowcaseData } from '@/lib/showcase';

export type MapPoint = { kind: 'synthetic' | 'public'; id: string };

// Geographic proximity is separate from road-network travel time.
function distanceKm(a: { lon: number; lat: number }, b: { lon: number; lat: number }) {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export default function FacilityPopup({ point, data, selected, assessment, cases, onOpenPoint }: { point: MapPoint; data: ShowcaseData; selected: Referral | null; assessment: Assessment | null; cases: Referral[]; onOpenPoint: (point: MapPoint) => void }) {
  const facility = point.kind === 'synthetic' ? data.facilities.find(f => f.id === point.id) : data.publicFacilities.find(f => f.id === point.id);
  if (!facility) return null;
  const synthetic = point.kind === 'synthetic' ? data.facilities.find(f => f.id === point.id)! : null;
  const publicFacility = point.kind === 'public' ? data.publicFacilities.find(f => f.id === point.id)! : null;
  const role = point.id === selected?.from ? 'Titik awal rujukan' : point.id === selected?.to ? 'RS tujuan rujukan' : assessment?.alternatives.some(f => f.id === point.id) ? 'RS alternatif layak' : synthetic?.kind === 'RS' ? 'RS pembanding' : 'FKTP lainnya';
  const route = synthetic?.kind === 'RS' && selected ? data.routes.find(r => r.from === selected.from && r.to === point.id) : null;
  const services = synthetic ? Object.entries(data.capabilities[point.id] ?? {}).filter(([, available]) => available).map(([name]) => name) : [];
  const capacity = selected?.capacities[point.id];
  const nearby = data.publicFacilities.filter(f => f.id !== point.id).map(f => ({ ...f, km: distanceKm(facility, f) })).filter(f => f.km <= 2).sort((a, b) => a.km - b.km || a.id.localeCompare(b.id)).slice(0, 5);
  const osmUrl = publicFacility && /^(node|way|relation)\/\d+$/.test(point.id) ? `https://www.openstreetmap.org/${point.id}` : null;
  return <section className="facility-popup" aria-label={`Informasi fasilitas ${publicFacility?.name ?? point.id}`}>
    <span className="facility-popup-source">{synthetic ? `FASILITAS SINTETIS · ${synthetic.kind}` : 'FASILITAS PUBLIK · OPENSTREETMAP'}</span>
    <h3>{publicFacility?.name ?? point.id}</h3>
    {synthetic && <p className="facility-popup-role">{role}</p>}
    <dl>
      <div><dt>Koordinat</dt><dd>{facility.lat.toFixed(5)}, {facility.lon.toFixed(5)}</dd></div>
      {synthetic && <div><dt>Kasus terkait</dt><dd>{cases.filter(r => r.from === point.id || r.to === point.id).length} sesuai filter aktif</dd></div>}
      {synthetic?.kind === 'RS' && selected && <>
        <div><dt>Dari {selected.from}</dt><dd>{minutes(route?.minutes ?? null)}{route?.km != null ? ` · ${route.km.toLocaleString('id-ID', { maximumFractionDigits: 1 })} km` : ''}</dd></div>
        <div><dt>Layanan kasus</dt><dd>{selected.service} · {data.capabilities[point.id]?.[selected.service] ? 'sesuai' : 'tidak sesuai'}</dd></div>
        <div><dt>Kapasitas kasus</dt><dd>{capacity === true ? 'Tersedia' : capacity === false ? 'Tidak tersedia' : 'Belum diketahui'}</dd></div>
      </>}
    </dl>
    {services.length > 0 && <div className="facility-popup-services"><strong>Layanan dalam skenario</strong><p>{services.join(' · ')}</p></div>}
    <p className="facility-popup-note">{synthetic ? `Data demo sintetis${selected ? ` · ${selected.id}` : ''}. Waktu memakai model Dijkstra; bukan lalu lintas langsung.` : 'Objek publik OSM. Layanan, jam operasional, kapasitas, dan kemitraan JKN belum tersedia dalam dataset ini.'}</p>
    {osmUrl && <a className="facility-popup-link" href={osmUrl} target="_blank" rel="noopener noreferrer">Lihat sumber OpenStreetMap ↗</a>}
    <div className="facility-popup-nearby"><strong>Fasilitas publik sekitar</strong><span>Dalam 2 km · jarak garis lurus</span>
      {nearby.length ? nearby.map(f => <button key={f.id} type="button" onClick={() => onOpenPoint({ kind: 'public', id: f.id })}><span>{f.name}</span><small>{f.km.toLocaleString('id-ID', { maximumFractionDigits: 2 })} km ↗</small></button>) : <p>Belum ada objek publik dalam radius ini pada snapshot.</p>}
    </div>
  </section>;
}
