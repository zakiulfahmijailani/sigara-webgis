'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { GeoJSONSource, Map as LibreMap, StyleSpecification } from 'maplibre-gl';
import { geoMercator, geoPath } from 'd3-geo';
import { createPortal } from 'react-dom';
import FacilityPopup, { type MapPoint } from './FacilityPopup';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import { Crosshair, Minus, Plus, MapPin, Layers } from 'lucide-react';
import { assess, colors, type Assessment, type Referral, type ShowcaseData } from '@/lib/showcase';

type Props = { data: ShowcaseData; cases: Referral[]; selected: Referral | null; assessment: Assessment | null; publicLayer: boolean; routesLayer: boolean; focusRequest: number; routeCaseCount?: number; onSelect: (id: string) => void; onShowPublic: () => void };
const bounds: [number, number, number, number] = [123.51, -10.302, 123.70, -10.122];
const collection = (features: Feature[]): FeatureCollection => ({ type: 'FeatureCollection', features });

function focusCase(map: LibreMap, p: Props, duration = 650) {
  const route = p.data.routes.find(r => r.from === p.selected?.from && r.to === p.selected?.to);
  if (!route?.geometry?.coordinates.length) return;
  const extent = new maplibregl.LngLatBounds();
  route.geometry.coordinates.forEach(c => extent.extend([c[0], c[1]]));
  p.data.facilities.filter(f => f.id === p.selected?.from || f.id === p.selected?.to).forEach(f => extent.extend([f.lon, f.lat]));
  map.fitBounds(extent, { padding: { top: 135, bottom: 80, left: 45, right: 45 }, maxZoom: 14, duration });
}

function overlays(p: Props) {
  const pairs = new Map<string, { r: Referral; n: number }>();
  p.cases.forEach(r => { const key = `${r.from}:${r.to}`; const old = pairs.get(key); pairs.set(key, { r, n: (old?.n ?? 0) + 1 }); });
  const lines: Feature[] = [];
  if (p.routesLayer) pairs.forEach(({ r, n }) => {
    const route = p.data.routes.find(x => x.from === r.from && x.to === r.to);
    if (route?.geometry) lines.push({ type: 'Feature', geometry: route.geometry, properties: { caseId: r.id, count: n, color: colors[assess(r, p.data).category], selected: p.selected?.from === r.from && p.selected?.to === r.to } });
  });
  const alt: Feature[] = [];
  if (p.routesLayer && p.selected) p.assessment?.alternatives.forEach(a => {
    const route = p.data.routes.find(x => x.from === p.selected!.from && x.to === a.id);
    if (route?.geometry) alt.push({ type: 'Feature', geometry: route.geometry, properties: { id: a.id } });
  });
  const points: Feature[] = p.data.facilities.map(f => {
    const related = p.cases.filter(r => r.from === f.id || r.to === f.id);
    const selected = !!p.selected && [p.selected.from, p.selected.to].includes(f.id);
    const priority = related.map(r => assess(r, p.data).category);
    const category = priority.includes('red') ? 'red' : priority.includes('orange') ? 'orange' : 'green';
    return { type: 'Feature', geometry: { type: 'Point', coordinates: [f.lon, f.lat] }, properties: { id: f.id, kind: f.kind, count: related.length, caseId: related[0]?.id ?? '', selected, color: related.length ? colors[category] : '#aebdb8' } };
  });
  const publicPoints: Feature[] = p.publicLayer ? p.data.publicFacilities.map(f => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [f.lon, f.lat] }, properties: { id: f.id, name: f.name } })) : [];
  // The selected route has its own feature: multiple cases can share a pair
  // but have different statuses, so the aggregated feature cannot identify it.
  const selectedRoute = p.data.routes.find(r => r.from === p.selected?.from && r.to === p.selected?.to);
  const selected: Feature[] = p.routesLayer && p.selected && selectedRoute?.geometry ? [{ type: 'Feature', geometry: selectedRoute.geometry, properties: { caseId: p.selected.id, color: colors[p.assessment!.category] } }] : [];
  return { lines: collection(lines), selected: collection(selected), alt: collection(alt), points: collection(points), publicPoints: collection(publicPoints) };
}

export default function KupangMap(props: Props) {
  const host = useRef<HTMLDivElement>(null), mapRef = useRef<LibreMap | null>(null), current = useRef(props);
  current.current = props;
  const [ready, setReady] = useState(false), [mode, setMode] = useState('Peta lokal'), [size, setSize] = useState({ width: 600, height: 550 });
  const layers = useMemo(() => overlays(props), [props]);
  const [fallbackZoom, setFallbackZoom] = useState(1);
  const [activePoint, setActivePoint] = useState<MapPoint | null>(null);
  const [popupHost, setPopupHost] = useState<HTMLDivElement | null>(null);
  function openPoint(point: MapPoint) {
    if (point.kind === 'public') current.current.onShowPublic();
    const facility = current.current.data.publicFacilities.find(f => f.id === point.id);
    if (point.kind === 'public' && facility) mapRef.current?.easeTo({ center: [facility.lon, facility.lat], duration: 350 });
    setActivePoint(point);
  }
  useEffect(() => { setActivePoint(null); }, [props.selected?.id, props.focusRequest]);
  useEffect(() => { if (!props.publicLayer && activePoint?.kind === 'public') setActivePoint(null); }, [props.publicLayer, activePoint?.kind]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !activePoint) return;
    const facility = activePoint.kind === 'synthetic' ? props.data.facilities.find(f => f.id === activePoint.id) : props.data.publicFacilities.find(f => f.id === activePoint.id);
    if (!facility) return;
    const content = document.createElement('div');
    const popup = new maplibregl.Popup({ closeOnClick: false, maxWidth: '300px', offset: 14, className: 'sigara-facility-popup' })
      .setLngLat([facility.lon, facility.lat]).setDOMContent(content).addTo(map);
    popup.getElement().setAttribute('role', 'dialog');
    popup.getElement().setAttribute('aria-label', 'Informasi titik fasilitas');
    popup.getElement().querySelector('button')?.setAttribute('aria-label', 'Tutup informasi fasilitas');
    // Portal content arrives after Popup construction: recalculate its anchor and
    // limit its height to the available side of the marker, including after pans.
    const update = () => {
      const pixel = map.project([facility.lon, facility.lat]);
      const available = Math.max(pixel.y, map.getContainer().clientHeight - pixel.y) - 80;
      content.style.setProperty('--facility-popup-height', `${Math.max(100, Math.min(400, available))}px`);
      popup.setLngLat([facility.lon, facility.lat]);
    };
    const resize = new ResizeObserver(update);
    resize.observe(content);
    map.on('move', update);
    const close = () => setActivePoint(null);
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    popup.on('close', close);
    document.addEventListener('keydown', escape);
    setPopupHost(content);
    return () => { resize.disconnect(); map.off('move', update); popup.off('close', close); popup.remove(); document.removeEventListener('keydown', escape); setPopupHost(null); };
  }, [activePoint, ready, props.data]);
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(entries => { const { width, height } = entries[0].contentRect; setSize({ width, height }); mapRef.current?.resize(); });
    observer.observe(host.current);
    const controller = new AbortController();
    let alive = true, map: LibreMap | undefined;
    const localStyle: StyleSpecification = { version: 8, sources: { 'local-roads': { type: 'geojson', data: props.data.roads } }, layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#eaf0ee' } },
      { id: 'local-roads', type: 'line', source: 'local-roads', paint: { 'line-color': '#cad5cf', 'line-width': 1.4 } },
    ] };
    function sync() {
      if (!map || !alive) return;
      const o = overlays(current.current);
      for (const [id, geo] of Object.entries(o)) {
        const src = map.getSource(id) as GeoJSONSource | undefined;
        if (src) src.setData(geo); else map.addSource(id, { type: 'geojson', data: geo });
      }
      if (!map.getSource('city')) map.addSource('city', { type: 'geojson', data: props.data.boundary });
      if (!map.getLayer('city-outline')) {
        map.addLayer({ id: 'city-tint', type: 'fill', source: 'city', paint: { 'fill-color': '#c6e6db', 'fill-opacity': .12 } });
        map.addLayer({ id: 'city-outline', type: 'line', source: 'city', paint: { 'line-color': '#537e70', 'line-width': 1.6, 'line-dasharray': [4, 3] } });
        map.addLayer({ id: 'public-points', type: 'circle', source: 'publicPoints', paint: { 'circle-color': '#596b82', 'circle-radius': 3, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1 } });
        map.addLayer({ id: 'routes-all', type: 'line', source: 'lines', paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': .16 } });
        map.addLayer({ id: 'alternatives', type: 'line', source: 'alt', paint: { 'line-color': '#4485b4', 'line-width': 3, 'line-dasharray': [3, 2] } });
        map.addLayer({ id: 'selected-route-outline', type: 'line', source: 'selected', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fff', 'line-width': 9 } });
        map.addLayer({ id: 'selected-route', type: 'line', source: 'selected', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': 5.5 } });
        map.addLayer({ id: 'facility-halo', type: 'circle', source: 'points', filter: ['==', ['get', 'selected'], true], paint: { 'circle-radius': 14, 'circle-color': ['get', 'color'], 'circle-opacity': .15 } });
        map.addLayer({ id: 'facilities', type: 'circle', source: 'points', paint: { 'circle-radius': ['case', ['==', ['get', 'kind'], 'RS'], 7, 5], 'circle-color': ['get', 'color'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
        // Default MapLibre glyphs are available only with the remote style.
        if (map.getStyle().glyphs) map.addLayer({ id: 'facility-labels', type: 'symbol', source: 'points', layout: { 'text-field': ['get', 'id'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-offset': [0, 1.6], 'text-allow-overlap': false }, paint: { 'text-color': '#284c42', 'text-halo-color': '#fff', 'text-halo-width': 1.5 } });
      }
      setReady(true);
      focusCase(map, current.current, 0);
    }
    try {
      map = new maplibregl.Map({ container: host.current, style: localStyle, center: [123.611, -10.193], zoom: 11.4, maxBounds: [123.45, -10.36, 123.77, -10.06], minZoom: 10, maxZoom: 17, attributionControl: false });
      mapRef.current = map;
      map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a> · GADM 4.1' }), 'bottom-right');
      map.on('style.load', sync);
      // Resolve point hits before routes, with a generous target for small public markers.
      map.on('click', e => {
        if (!map) return;
        const area: [[number, number], [number, number]] = [[e.point.x - 9, e.point.y - 9], [e.point.x + 9, e.point.y + 9]];
        const pointLayers = ['facilities', 'public-points'].filter(id => map!.getLayer(id));
        const hits = map.queryRenderedFeatures(area, { layers: pointLayers }).filter(f => f.geometry.type === 'Point');
        hits.sort((a, b) => {
          const pa = map!.project((a.geometry as GeoJSON.Point).coordinates as [number, number]);
          const pb = map!.project((b.geometry as GeoJSON.Point).coordinates as [number, number]);
          return Math.hypot(pa.x - e.point.x, pa.y - e.point.y) - Math.hypot(pb.x - e.point.x, pb.y - e.point.y);
        });
        if (hits[0]?.properties?.id) {
          setActivePoint({ kind: hits[0].layer.id === 'public-points' ? 'public' : 'synthetic', id: String(hits[0].properties.id) });
          return;
        }
        const routeLayers = ['selected-route', 'routes-all'].filter(id => map!.getLayer(id));
        setActivePoint(null);
        const id = map.queryRenderedFeatures(e.point, { layers: routeLayers })[0]?.properties?.caseId;
        if (id) current.current.onSelect(id);
      });
      map.on('mousemove', e => {
        if (!map) return;
        const pointLayers = ['facilities', 'public-points', 'selected-route', 'routes-all'].filter(id => map!.getLayer(id));
        map.getCanvas().style.cursor = map.queryRenderedFeatures([[e.point.x - 7, e.point.y - 7], [e.point.x + 7, e.point.y + 7]], { layers: pointLayers }).length ? 'pointer' : '';
      });
      map.on('mouseleave', () => { if (map) map.getCanvas().style.cursor = ''; });
      map.on('error', () => { if (alive && map && !map.getSource('local-roads')) { map.setStyle(localStyle); setMode('Peta lokal · OSM'); } });
      fetch('https://tiles.openfreemap.org/styles/positron', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
        .then(r => { if (!r.ok) throw Error('Basemap unavailable'); return r.json(); })
        .then((style: StyleSpecification) => { if (alive && map) { map.setStyle(style); setMode('OpenFreeMap · Positron'); } })
        .catch(() => { if (alive) setMode('Peta lokal · OSM'); });
    } catch { setMode('Peta lokal · OSM'); }
    return () => { alive = false; controller.abort(); observer.disconnect(); map?.remove(); mapRef.current = null; };
  }, [props.data]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    Object.entries(layers).forEach(([id, geo]) => (map.getSource(id) as GeoJSONSource | undefined)?.setData(geo));
  }, [layers, ready]);
  const prevRouteKey = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const currentRouteKey = props.selected ? `${props.selected.from}->${props.selected.to}` : null;
    const isNewRoute = currentRouteKey !== prevRouteKey.current;
    prevRouteKey.current = currentRouteKey;

    if (isNewRoute || props.focusRequest > 0) {
      focusCase(map, current.current);
    }
    setFallbackZoom(1);
  }, [props.selected?.from, props.selected?.to, props.focusRequest, ready]);
  const projection = geoMercator().fitExtent([[24, 30], [Math.max(80, size.width - 24), Math.max(90, size.height - 55)]], props.data.boundary);
  const path = geoPath(projection);
  function zoom(delta: number) { if (mapRef.current) mapRef.current.zoomTo(mapRef.current.getZoom() + delta); else setFallbackZoom(x => Math.max(1, Math.min(2.5, x + delta * .25))); }
  return <div className="map-surface">
    <div ref={host} className="map-canvas" aria-label="Peta interaktif Kota Kupang" />
    {!ready && <svg className="map-fallback interactive-fallback" viewBox={`0 0 ${size.width} ${size.height}`} role="img" aria-label="Peta lokal Kota Kupang dengan rute rujukan"><g transform={`translate(${size.width / 2} ${size.height / 2}) scale(${fallbackZoom}) translate(${-size.width / 2} ${-size.height / 2})`}>
      <path d={path(props.data.boundary) ?? ''} fill="#f7f6ee" stroke="#719689" strokeDasharray="5 4" />
      <path d={path(props.data.roads) ?? ''} stroke="#c9d1c8" fill="none" strokeWidth="1" />
      {layers.lines.features.map((f, i) => <path key={`r${i}`} d={path(f.geometry) ?? ''} fill="none" stroke={f.properties?.color} strokeWidth={f.properties?.selected ? 4 : 2} opacity={f.properties?.selected ? 1 : .4} />)}
      {layers.alt.features.map((f, i) => <path key={`a${i}`} d={path(f.geometry) ?? ''} fill="none" stroke="#4485b4" strokeWidth="2" strokeDasharray="5 4" />)}
      {layers.selected.features.map(f => <path key={f.properties?.caseId} d={path(f.geometry) ?? ''} fill="none" stroke={f.properties?.color} strokeWidth="5" />)}
      {props.publicLayer && props.data.publicFacilities.map(f => { const p = projection([f.lon, f.lat])!; return <g key={f.id} role="button" tabIndex={0} aria-label={`Informasi ${f.name}`} onClick={() => openPoint({ kind: 'public', id: f.id })} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPoint({ kind: 'public', id: f.id }); } }}><circle cx={p[0]} cy={p[1]} r="10" fill="transparent" /><circle cx={p[0]} cy={p[1]} r="3" fill="#657286" /></g>; })}
      {layers.points.features.map(f => { const g = f.geometry as GeoJSON.Point; const p = projection([g.coordinates[0], g.coordinates[1]])!; return <g key={f.properties?.id} role="button" tabIndex={0} aria-label={`Informasi ${f.properties?.id}`} onClick={() => openPoint({ kind: 'synthetic', id: f.properties!.id })} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPoint({ kind: 'synthetic', id: f.properties!.id }); } }}><circle cx={p[0]} cy={p[1]} r="12" fill="transparent" /><circle cx={p[0]} cy={p[1]} r={f.properties?.selected ? 7 : 5} fill={f.properties?.color} stroke="white" strokeWidth="2" /><text x={p[0] + 7} y={p[1] - 7} fontSize="10" fill="#254b40">{f.properties?.id}</text></g>; })}
    </g></svg>}
    {activePoint && popupHost && createPortal(<FacilityPopup point={activePoint} data={props.data} selected={props.selected} assessment={props.assessment} cases={props.cases} onOpenPoint={openPoint} />, popupHost)}
    {activePoint && !ready && <div className="fallback-facility-popup" role="dialog" aria-label="Informasi titik fasilitas"><button className="fallback-popup-close" aria-label="Tutup informasi fasilitas" onClick={() => setActivePoint(null)}>×</button><FacilityPopup point={activePoint} data={props.data} selected={props.selected} assessment={props.assessment} cases={props.cases} onOpenPoint={openPoint} /></div>}
    <div className="map-location"><MapPin size={15} /><div><strong>Kota Kupang</strong><span>Nusa Tenggara Timur</span></div><span className="map-location-dot" /></div>
    {props.selected && <div className="map-selected-case" role="status" aria-live="polite"><strong>{props.selected.id}</strong><span>Asal {props.selected.from} → Tujuan {props.selected.to}{props.routeCaseCount ? ` (${props.routeCaseCount} kasus rujukan)` : ''}</span><small>{props.routesLayer ? 'Garis tebal: rute kasus terpilih' : 'Layer rute sedang disembunyikan'}</small></div>}
    <div className="map-controls"><button aria-label="Perbesar peta" onClick={() => zoom(1)}><Plus size={17} /></button><button aria-label="Perkecil peta" onClick={() => zoom(-1)}><Minus size={17} /></button><button aria-label="Tampilkan seluruh Kota Kupang" onClick={() => { mapRef.current?.fitBounds(bounds, { padding: 32, duration: 500 }); setFallbackZoom(1); }}><Crosshair size={17} /></button></div>
    <div className="map-key"><span><i className="key-origin" />FKTP</span><span><i className="key-target" />RS sintetis</span><span><i className="key-line" />Rute tujuan</span><span><i className="key-alt" />Alternatif layak</span></div>
    <div className="map-source"><Layers size={11} />{mode}</div>
    {!ready && <div className="fallback-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a> · GADM 4.1</div>}
  </div>;
}
