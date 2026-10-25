'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type Map as LibreMap, type StyleSpecification } from 'maplibre-gl';
import { geoMercator, geoPath } from 'd3-geo';
import { Crosshair, MapPinned } from 'lucide-react';
import { NTT_BOUNDS, originFeatures, type Camera } from '@/lib/map-overview';
import { formatNumber, type Episode, type ShowcaseData } from '@/lib/showcase';

type Props = {
  data: ShowcaseData; episodes: Episode[]; initialCamera: Camera | null;
  district: string; selectedOrigin: string; showFacilities: boolean;
  onOrigin: (origin: string) => void; onCamera: (camera: Camera) => void;
};

export default function OverviewMap(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const current = useRef(props); current.current = props;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [size, setSize] = useState({ width: 960, height: 560 });
  const features = useMemo(() => originFeatures(props.episodes), [props.episodes]);
  const currentFeatures = useRef(features); currentFeatures.current = features;
  const refresh = useRef<() => void>(() => {});

  useEffect(() => {
    if (!host.current) return;
    let map: LibreMap | undefined;
    let alive = true;
    const markers = new Map<string, maplibregl.Marker>();
    const resize = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      map?.resize();
    });
    resize.observe(host.current);
    // Local geography is the first frame and remains usable without external tiles or API keys.
    const style: StyleSpecification = {
      version: 8,
      sources: {
        province: { type: 'geojson', data: props.data.boundary },
        districts: { type: 'geojson', data: props.data.districts },
        facilities: { type: 'geojson', data: props.data.facilities },
        episodes: {
          type: 'geojson', data: currentFeatures.current, cluster: true, clusterRadius: 48, clusterMaxZoom: 12,
          clusterProperties: { total: ['+', ['get', 'total']], red: ['+', ['get', 'red']], orange: ['+', ['get', 'orange']], green: ['+', ['get', 'green']] },
        },
      },
      layers: [
        { id: 'sea', type: 'background', paint: { 'background-color': '#e8f0f1' } },
        { id: 'land-shadow', type: 'line', source: 'province', paint: { 'line-color': '#c5d5d2', 'line-width': 7, 'line-blur': 4 } },
        { id: 'land', type: 'fill', source: 'province', paint: { 'fill-color': '#fafaf4' } },
        { id: 'districts', type: 'line', source: 'districts', paint: { 'line-color': '#b7c7b9', 'line-width': 0.8, 'line-dasharray': [3, 3] } },
        { id: 'coast', type: 'line', source: 'province', paint: { 'line-color': '#9caf9f', 'line-width': 1.1 } },
        { id: 'references', type: 'circle', source: 'facilities', layout: { visibility: current.current.showFacilities ? 'visible' : 'none' }, paint: { 'circle-radius': 3, 'circle-color': '#647c79', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1 } },
        // A source-backed layer keeps cluster features available for accessible HTML markers.
        { id: 'episode-anchor', type: 'circle', source: 'episodes', paint: { 'circle-radius': 1, 'circle-opacity': 0 } },
      ],
    };
    try {
      const camera = current.current.initialCamera;
      map = new maplibregl.Map({ container: host.current, style, attributionControl: false,
        ...(camera ? { center: [camera.lng, camera.lat] as [number, number], zoom: camera.zoom } : { bounds: NTT_BOUNDS, fitBoundsOptions: { padding: 55 } }),
        minZoom: 4, maxZoom: 16, maxBounds: [[117, -13], [127, -6]], renderWorldCopies: false,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric', maxWidth: 100 }), 'bottom-left');
      map.addControl(new maplibregl.AttributionControl({ compact: false, customAttribution: '<a href="https://gadm.org/" target="_blank" rel="noopener noreferrer">Batas wilayah: GADM 4.1</a>' }), 'bottom-right');
      // Context labels only; episode locations always come from the master dataset.
      const islands: [string, number, number][] = [['Flores', 121.1, -8.18], ['Sumba', 119.9, -9.25], ['Timor', 124.2, -9.2], ['Alor', 124.7, -7.98], ['Lembata', 123.55, -8.1], ['Rote', 122.9, -10.95], ['Sabu', 121.85, -10.68]];
      for (const [name, lng, lat] of islands) {
        const label = document.createElement('span'); label.className = 'overview-island-label'; label.textContent = name;
        new maplibregl.Marker({ element: label }).setLngLat([lng, lat]).addTo(map);
      }

      const updateMarkers = () => {
        if (!alive || !map?.isSourceLoaded('episodes')) return;
        const visible = new Set<string>();
        for (const feature of map.querySourceFeatures('episodes')) {
          if (feature.geometry.type !== 'Point') continue;
          const p = feature.properties!;
          const coords = feature.geometry.coordinates as [number, number];
          if (!map.getBounds().contains(coords)) continue;
          const key = p.cluster ? `cluster-${p.cluster_id}-${coords.join(',')}-${p.total}-${p.red}-${p.orange}` : `origin-${p.origin}`;
          if (visible.has(key)) continue;
          visible.add(key);
          const total = Number(p.total);
          const red = Number(p.red) / total * 100;
          const orange = red + Number(p.orange) / total * 100;
          const title = `${formatNumber(total)} episode · ${p.red} tinggi, ${p.orange} sedang, ${p.green} rendah. ${p.cluster ? 'Perbesar kelompok wilayah' : 'Lihat episode dari ' + p.name}`;
          let marker = markers.get(key);
          if (!marker) {
            const button = document.createElement('button');
            button.type = 'button';
            button.innerHTML = '<span></span>';
            button.addEventListener('click', async () => {
              if (!map || !alive) return;
              if (p.cluster) {
                try {
                  const z = await (map.getSource('episodes') as GeoJSONSource).getClusterExpansionZoom(Number(p.cluster_id));
                  if (alive) map.easeTo({ center: coords, zoom: z, duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450 });
                } catch { /* The source may have changed while filtering. */ }
              } else current.current.onOrigin(String(p.origin));
            });
            marker = new maplibregl.Marker({ element: button }).setLngLat(coords).addTo(map);
            markers.set(key, marker);
          }
          const button = marker.getElement();
          button.classList.add('overview-marker');
          button.classList.toggle('is-cluster', Boolean(p.cluster));
          button.classList.toggle('is-selected', current.current.selectedOrigin === p.origin);
          button.style.background = `conic-gradient(#c74b40 0% ${red}%, #b57813 ${red}% ${orange}%, #258471 ${orange}% 100%)`;
          button.setAttribute('aria-label', title); button.title = title;
          button.firstElementChild!.textContent = formatNumber(total);
        }
        for (const [key, marker] of markers) if (!visible.has(key)) { marker.remove(); markers.delete(key); }
      };
      refresh.current = () => {
        // Recreate click closures when filtered source contents change.
        for (const marker of markers.values()) marker.remove();
        markers.clear(); updateMarkers();
      };
      map.on('load', () => { if (alive) { setReady(true); updateMarkers(); } });
      map.on('sourcedata', event => { if (event.sourceId === 'episodes') updateMarkers(); });
      map.on('move', updateMarkers);
      map.on('moveend', () => {
        if (!map || !alive) return;
        const c = map.getCenter();
        current.current.onCamera({ lng: c.lng, lat: c.lat, zoom: map.getZoom() });
      });
      map.getCanvas().addEventListener('webglcontextlost', () => { if (alive) { setReady(false); setFailed(true); } });
    } catch { setFailed(true); }
    return () => {
      alive = false; resize.disconnect(); markers.forEach(marker => marker.remove()); map?.remove(); mapRef.current = null;
    };
  }, [props.data]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource('episodes') as GeoJSONSource).setData(features);
    refresh.current();
  }, [features, ready]);
  useEffect(() => { if (ready) refresh.current(); }, [props.selectedOrigin, ready]);
  useEffect(() => {
    if (ready) mapRef.current?.setLayoutProperty('references', 'visibility', props.showFacilities ? 'visible' : 'none');
  }, [props.showFacilities, ready]);

  const lastDistrict = useRef(props.district);
  useEffect(() => {
    if (!ready || !mapRef.current || lastDistrict.current === props.district) return;
    lastDistrict.current = props.district;
    if (props.district === 'all') { mapRef.current.fitBounds(NTT_BOUNDS, { padding: 55, duration: 0 }); return; }
    if (features.features.length) {
      const bounds = new maplibregl.LngLatBounds();
      features.features.forEach(f => bounds.extend(f.geometry.coordinates as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: 65, maxZoom: 10, duration: 0 });
    }
  }, [props.district, features, ready]);

  const projection = geoMercator().fitExtent([[35, 55], [Math.max(90, size.width - 35), Math.max(120, size.height - 55)]], props.data.boundary);
  const path = geoPath(projection);
  return <div className="overview-map" aria-label="Peta indikasi episode rujukan NTT">
    <div ref={host} className="overview-map-canvas" aria-label="Peta interaktif; gunakan daftar episode sebagai alternatif navigasi" />
    {(!ready || failed) && <svg className="overview-map-fallback" viewBox={`0 0 ${size.width} ${size.height}`} aria-label="Peta NTT sederhana">
      {props.data.boundary.features.map((f, i) => <path key={i} d={path(f) || ''} fill="#fafaf4" stroke="#9caf9f" />)}
      {props.data.districts.features.map((f, i) => <path key={i} d={path(f) || ''} fill="none" stroke="#b7c7b9" strokeWidth="0.7" />)}
      {features.features.map(f => {
        const xy = projection(f.geometry.coordinates as [number, number]); if (!xy) return null;
        const p = f.properties;
        return <g key={p.origin} transform={`translate(${xy[0]},${xy[1]})`} role="button" tabIndex={0}
          aria-label={`${p.name}: ${p.total} episode`} onClick={() => props.onOrigin(p.origin)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); props.onOrigin(p.origin); } }}>
          <circle r="9" fill={p.red ? '#c74b40' : p.orange ? '#b57813' : '#258471'} stroke="white" strokeWidth="2" />
          <title>{p.name}: {p.total} episode</title>
        </g>;
      })}
    </svg>}
    <div className="overview-map-caption"><MapPinned size={16} /><div><strong>Nusa Tenggara Timur</strong><span>{failed ? 'Peta sederhana · gunakan daftar untuk menelaah' : 'Pilih titik untuk melihat episode rujukan'}</span></div></div>
    <button className="overview-reset-map" onClick={() => mapRef.current?.fitBounds(NTT_BOUNDS, { padding: 55, duration: 0 })} aria-label="Tampilkan seluruh NTT" title="Tampilkan seluruh NTT"><Crosshair size={18} /></button>
    <div className="overview-map-guide">Angka = jumlah episode · warna = komposisi indikasi simulasi</div>
  </div>;
}
