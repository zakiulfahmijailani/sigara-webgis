'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type Map as LibreMap, type StyleSpecification } from 'maplibre-gl';
import { geoMercator, geoPath } from 'd3-geo';
import { ArrowRight, Crosshair, ExternalLink, MapPinned, X } from 'lucide-react';
import {
  NTT_BOUNDS,
  originFeatures,
  journeyFeatures,
  endpointFeatures,
  investigationHref,
  type Camera,
  type JourneyLineProperties,
} from '@/lib/map-overview';
import { dateLabel, formatFacilityName, formatNumber, type Episode, type ShowcaseData } from '@/lib/showcase';

type Props = {
  data: ShowcaseData;
  episodes: Episode[];
  initialCamera: Camera | null;
  district: string;
  selectedOrigin: string;
  selectedLine: string | null;
  showFacilities: boolean;
  listOpen: boolean;
  onOrigin: (origin: string) => void;
  onSelectLine: (lineId: string | null) => void;
  onCamera: (camera: Camera) => void;
  onResetView: () => void;
};

export default function OverviewMap(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const current = useRef(props);
  current.current = props;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [size, setSize] = useState({ width: 960, height: 560 });
  const [currentZoom, setCurrentZoom] = useState(props.initialCamera?.zoom ?? 6.2);
  const [candidateLines, setCandidateLines] = useState<string[]>([]);

  // Features for origins, journeys, and endpoints
  const features = useMemo(() => originFeatures(props.episodes), [props.episodes]);
  const currentFeatures = useRef(features);
  currentFeatures.current = features;

  const allJourneys = useMemo(
    () => journeyFeatures(props.episodes, props.selectedOrigin),
    [props.episodes, props.selectedOrigin]
  );
  const allEndpoints = useMemo(() => endpointFeatures(allJourneys), [allJourneys]);

  // Line mode is active if a specific origin is selected OR zoom is detail level (>= 8.0)
  const isLineMode = Boolean(props.selectedOrigin) || currentZoom >= 8.0;

  const activeJourneys = useMemo(() => {
    return isLineMode ? allJourneys : { type: 'FeatureCollection' as const, features: [] };
  }, [isLineMode, allJourneys]);

  const activeEndpoints = useMemo(() => {
    return isLineMode ? allEndpoints : { type: 'FeatureCollection' as const, features: [] };
  }, [isLineMode, allEndpoints]);

  const currentJourneys = useRef(activeJourneys);
  currentJourneys.current = activeJourneys;
  const currentEndpoints = useRef(activeEndpoints);
  currentEndpoints.current = activeEndpoints;

  const refresh = useRef<() => void>(() => {});

  const getPadding = (listOpen: boolean) => {
    if (typeof window === 'undefined') return { top: 50, bottom: 50, left: 50, right: 50 };
    const isMobile = window.innerWidth <= 760;
    return isMobile
      ? { top: 35, bottom: listOpen ? 150 : 35, left: 15, right: 15 }
      : { top: 55, bottom: 55, left: 55, right: listOpen ? 370 : 55 };
  };

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

    const style: StyleSpecification = {
      version: 8,
      sources: {
        province: { type: 'geojson', data: props.data.boundary },
        districts: { type: 'geojson', data: props.data.districts },
        facilities: { type: 'geojson', data: props.data.facilities },
        episodes: {
          type: 'geojson',
          data: currentFeatures.current,
          cluster: true,
          clusterRadius: 48,
          clusterMaxZoom: 12,
          clusterProperties: {
            total: ['+', ['get', 'total']],
            red: ['+', ['get', 'red']],
            orange: ['+', ['get', 'orange']],
            green: ['+', ['get', 'green']],
          },
        },
        'overview-journeys': {
          type: 'geojson',
          data: currentJourneys.current,
        },
        'overview-endpoints': {
          type: 'geojson',
          data: currentEndpoints.current,
        },
      },
      layers: [
        { id: 'sea', type: 'background', paint: { 'background-color': '#e8f0f1' } },
        { id: 'land-shadow', type: 'line', source: 'province', paint: { 'line-color': '#c5d5d2', 'line-width': 7, 'line-blur': 4 } },
        { id: 'land', type: 'fill', source: 'province', paint: { 'fill-color': '#fafaf4' } },
        { id: 'districts', type: 'line', source: 'districts', paint: { 'line-color': '#b7c7b9', 'line-width': 0.8, 'line-dasharray': [3, 3] } },
        { id: 'coast', type: 'line', source: 'province', paint: { 'line-color': '#9caf9f', 'line-width': 1.1 } },
        {
          id: 'references',
          type: 'circle',
          source: 'facilities',
          layout: { visibility: current.current.showFacilities ? 'visible' : 'none' },
          paint: { 'circle-radius': 3, 'circle-color': '#647c79', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1 },
        },
        // Journey Line Layers
        {
          id: 'overview-journeys-halo',
          type: 'line',
          source: 'overview-journeys',
          paint: {
            'line-color': '#ffffff',
            'line-width': ['+', ['get', 'lineWidth'], 3],
            'line-opacity': 0.85,
          },
        },
        {
          id: 'overview-journeys-line',
          type: 'line',
          source: 'overview-journeys',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['get', 'lineWidth'],
            'line-opacity': 0.92,
            'line-dasharray': [4, 2],
          },
        },
        {
          id: 'overview-journeys-selected-halo',
          type: 'line',
          source: 'overview-journeys',
          filter: ['==', ['get', 'id'], ''],
          paint: {
            'line-color': '#ffffff',
            'line-width': ['+', ['get', 'lineWidth'], 7],
            'line-opacity': 0.95,
          },
        },
        {
          id: 'overview-journeys-selected',
          type: 'line',
          source: 'overview-journeys',
          filter: ['==', ['get', 'id'], ''],
          paint: {
            'line-color': '#1d4ed8',
            'line-width': ['+', ['get', 'lineWidth'], 3.5],
            'line-opacity': 1,
          },
        },
        {
          id: 'overview-journeys-hit',
          type: 'line',
          source: 'overview-journeys',
          paint: {
            'line-color': '#000000',
            'line-width': 22,
            'line-opacity': 0.001,
          },
        },
        // Endpoints Layers
        {
          id: 'overview-endpoints-dest',
          type: 'circle',
          source: 'overview-endpoints',
          filter: ['==', ['get', 'role'], 'destination'],
          paint: {
            'circle-radius': 5.5,
            'circle-color': ['get', 'color'],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
            'circle-opacity': 0.9,
          },
        },
        {
          id: 'overview-endpoints-origin',
          type: 'circle',
          source: 'overview-endpoints',
          filter: ['==', ['get', 'role'], 'origin'],
          paint: {
            'circle-radius': 7,
            'circle-color': '#166534',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2.5,
            'circle-opacity': 0.95,
          },
        },
        // Source-backed anchor for MapLibre clustering
        { id: 'episode-anchor', type: 'circle', source: 'episodes', paint: { 'circle-radius': 1, 'circle-opacity': 0 } },
      ],
    };

    try {
      const camera = current.current.initialCamera;
      map = new maplibregl.Map({
        container: host.current,
        style,
        attributionControl: false,
        ...(camera
          ? { center: [camera.lng, camera.lat] as [number, number], zoom: camera.zoom }
          : { bounds: NTT_BOUNDS, fitBoundsOptions: { padding: 55 } }),
        minZoom: 4,
        maxZoom: 16,
        maxBounds: [[117, -13], [127, -6]],
        renderWorldCopies: false,
      });
      mapRef.current = map;
      if (typeof window !== 'undefined') (window as any).__sigaraMap = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric', maxWidth: 100 }), 'bottom-left');
      map.addControl(
        new maplibregl.AttributionControl({
          compact: false,
          customAttribution: '<a href="https://gadm.org/" target="_blank" rel="noopener noreferrer">Batas wilayah: GADM 4.1</a>',
        }),
        'bottom-right'
      );

      const islands: [string, number, number][] = [
        ['Flores', 121.1, -8.18],
        ['Sumba', 119.9, -9.25],
        ['Timor', 124.2, -9.2],
        ['Alor', 124.7, -7.98],
        ['Lembata', 123.55, -8.1],
        ['Rote', 122.9, -10.95],
        ['Sabu', 121.85, -10.68],
      ];
      for (const [name, lng, lat] of islands) {
        const label = document.createElement('span');
        label.className = 'overview-island-label';
        label.textContent = name;
        new maplibregl.Marker({ element: label }).setLngLat([lng, lat]).addTo(map);
      }

      const updateMarkers = () => {
        if (!alive || !map?.isSourceLoaded('episodes')) return;
        const visible = new Set<string>();
        const zoom = map.getZoom();
        const selectedOrig = current.current.selectedOrigin;

        for (const feature of map.querySourceFeatures('episodes')) {
          if (feature.geometry.type !== 'Point') continue;
          const p = feature.properties!;
          const coords = feature.geometry.coordinates as [number, number];
          if (!map.getBounds().contains(coords)) continue;

          // If an origin is selected, hide other origin/cluster markers to keep journey lines dominant
          if (selectedOrig && (!p.origin || String(p.origin) !== selectedOrig)) {
            continue;
          }

          const key = p.cluster
            ? `cluster-${p.cluster_id}-${coords.join(',')}-${p.total}-${p.red}-${p.orange}`
            : `origin-${p.origin}`;
          if (visible.has(key)) continue;
          visible.add(key);

          const total = Number(p.total);
          const red = (Number(p.red) / total) * 100;
          const orange = red + (Number(p.orange) / total) * 100;
          const title = `${formatNumber(total)} episode · ${p.red} tinggi, ${p.orange} sedang, ${p.green} rendah. ${
            p.cluster ? 'Perbesar kelompok wilayah' : 'Fokus episode dari ' + p.name
          }`;

          let marker = markers.get(key);
          if (!marker) {
            const button = document.createElement('button');
            button.type = 'button';
            button.innerHTML = '<span></span>';
            button.addEventListener('click', async (e) => {
              e.stopPropagation();
              if (!map || !alive) return;
              const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              const duration = isReducedMotion ? 0 : 450;
              const padding = getPadding(current.current.listOpen);

              if (p.cluster) {
                const clusterId = Number(p.cluster_id);
                const source = map.getSource('episodes') as GeoJSONSource;
                let targetZoom: number | null = null;
                let bounds: maplibregl.LngLatBounds | null = null;

                try {
                  const leaves = await source.getClusterLeaves(clusterId, 1000, 0);
                  if (leaves && leaves.length > 0) {
                    bounds = new maplibregl.LngLatBounds();
                    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
                    for (const leaf of leaves) {
                      const [lng, lat] = (leaf.geometry as GeoJSON.Point).coordinates;
                      bounds.extend([lng, lat]);
                      minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
                      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
                    }
                    if (Math.abs(maxLng - minLng) < 0.0001 && Math.abs(maxLat - minLat) < 0.0001) {
                      bounds = null;
                      targetZoom = Math.min(13, Math.max(map.getZoom() + 2.5, 10.5));
                    }
                  }
                } catch {
                  // Fallback if leaves query fails
                }

                if (!bounds && targetZoom == null) {
                  try {
                    const expansionZoom = await source.getClusterExpansionZoom(clusterId);
                    targetZoom = expansionZoom > map.getZoom() ? expansionZoom : map.getZoom() + 2;
                  } catch {
                    targetZoom = map.getZoom() + 2;
                  }
                }

                if (map.getZoom() >= 12 && (!bounds || targetZoom == null || targetZoom <= map.getZoom())) {
                  try {
                    const leaves = await source.getClusterLeaves(clusterId, 10, 0);
                    if (leaves && leaves.length > 0 && leaves[0].properties?.origin) {
                      current.current.onOrigin(String(leaves[0].properties.origin));
                      return;
                    }
                  } catch {}
                }

                if (bounds) {
                  map.fitBounds(bounds, { padding, maxZoom: 12.5, duration });
                } else {
                  map.easeTo({
                    center: coords,
                    zoom: Math.min(map.getMaxZoom(), Math.max(targetZoom ?? (map.getZoom() + 2), map.getZoom() + 1.5)),
                    duration,
                    padding,
                  });
                }
              } else {
                // Single origin click: center camera, zoom to detail, and disclose journey lines
                const originId = String(p.origin);
                const targetZoom = Math.max(map.getZoom(), 10.5);
                map.easeTo({ center: coords, zoom: targetZoom, duration, padding });
                current.current.onOrigin(originId);
              }
            });
            marker = new maplibregl.Marker({ element: button }).setLngLat(coords).addTo(map);
            markers.set(key, marker);
          }

          const button = marker.getElement();
          button.classList.add('overview-marker');
          button.classList.toggle('is-cluster', Boolean(p.cluster));
          button.classList.toggle('is-selected', selectedOrig === p.origin);
          button.classList.toggle('is-detail-node', zoom >= 8.0 && !p.cluster);
          button.style.background = `conic-gradient(#c74b40 0% ${red}%, #b57813 ${red}% ${orange}%, #258471 ${orange}% 100%)`;
          button.setAttribute('aria-label', title);
          button.title = title;
          button.firstElementChild!.textContent = formatNumber(total);
        }

        for (const [key, marker] of markers) {
          if (!visible.has(key)) {
            marker.remove();
            markers.delete(key);
          }
        }
      };

      refresh.current = () => {
        for (const marker of markers.values()) marker.remove();
        markers.clear();
        updateMarkers();
      };

      map.on('load', () => {
        if (alive) {
          setReady(true);
          updateMarkers();
        }
      });
      map.on('sourcedata', (event) => {
        if (event.sourceId === 'episodes') updateMarkers();
      });
      map.on('move', () => {
        if (!map || !alive) return;
        setCurrentZoom(map.getZoom());
        updateMarkers();
      });
      map.on('moveend', () => {
        if (!map || !alive) return;
        const c = map.getCenter();
        current.current.onCamera({ lng: c.lng, lat: c.lat, zoom: map.getZoom() });
      });

      // Journey Line Hit Testing
      map.on('click', 'overview-journeys-hit', (e) => {
        if (!map || !alive || !e.features?.length) return;
        const hits = map.queryRenderedFeatures(e.point, { layers: ['overview-journeys-hit'] });
        if (!hits.length) return;
        const ids = Array.from(new Set(hits.map((h) => String(h.properties?.id)).filter(Boolean)));
        if (ids.length === 1) {
          setCandidateLines([]);
          current.current.onSelectLine(ids[0]);
        } else {
          setCandidateLines(ids);
          current.current.onSelectLine(ids[0]);
        }
      });

      map.on('mouseenter', 'overview-journeys-hit', () => {
        if (map) map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'overview-journeys-hit', () => {
        if (map) map.getCanvas().style.cursor = '';
      });

      // Click on origin or destination pins
      map.on('click', 'overview-endpoints-origin', (e) => {
        if (!e.features?.length) return;
        const origId = e.features[0].properties?.id;
        if (origId) current.current.onOrigin(String(origId));
      });

      map.getCanvas().addEventListener('webglcontextlost', () => {
        if (alive) {
          setReady(false);
          setFailed(true);
        }
      });
    } catch {
      setFailed(true);
    }

    return () => {
      alive = false;
      resize.disconnect();
      markers.forEach((marker) => marker.remove());
      map?.remove();
      mapRef.current = null;
    };
  }, [props.data]);

  // Sync origin features to MapLibre episodes source
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource('episodes') as GeoJSONSource | undefined)?.setData(features);
    refresh.current();
  }, [features, ready]);

  // Sync journeys & endpoints features to MapLibre layers
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource('overview-journeys') as GeoJSONSource | undefined)?.setData(activeJourneys);
    (map.getSource('overview-endpoints') as GeoJSONSource | undefined)?.setData(activeEndpoints);
    refresh.current();
  }, [activeJourneys, activeEndpoints, ready]);

  // Highlight selected journey line
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const lineFilter = props.selectedLine ? ['==', ['get', 'id'], props.selectedLine] : ['==', ['get', 'id'], ''];
    if (map.getLayer('overview-journeys-selected')) {
      map.setFilter('overview-journeys-selected', lineFilter as any);
    }
    if (map.getLayer('overview-journeys-selected-halo')) {
      map.setFilter('overview-journeys-selected-halo', lineFilter as any);
    }
  }, [props.selectedLine, ready]);

  // Center on selected origin when origin changes externally (e.g. from list)
  const lastSelectedOrigin = useRef<string | null>(props.selectedOrigin);
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (props.selectedOrigin && props.selectedOrigin !== lastSelectedOrigin.current) {
      lastSelectedOrigin.current = props.selectedOrigin;
      const feat = features.features.find((f) => f.properties.origin === props.selectedOrigin);
      if (feat) {
        const coords = feat.geometry.coordinates as [number, number];
        const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const duration = isReducedMotion ? 0 : 450;
        const targetZoom = Math.max(mapRef.current.getZoom(), 10.5);
        mapRef.current.easeTo({ center: coords, zoom: targetZoom, duration, padding: getPadding(props.listOpen) });
      }
    } else if (!props.selectedOrigin) {
      lastSelectedOrigin.current = null;
    }
  }, [props.selectedOrigin, ready, features, props.listOpen]);

  // Toggle reference facilities visibility
  useEffect(() => {
    if (ready) {
      mapRef.current?.setLayoutProperty('references', 'visibility', props.showFacilities ? 'visible' : 'none');
    }
  }, [props.showFacilities, ready]);

  // District filter zoom
  const lastDistrict = useRef(props.district);
  useEffect(() => {
    if (!ready || !mapRef.current || lastDistrict.current === props.district) return;
    lastDistrict.current = props.district;
    if (props.district === 'all') {
      mapRef.current.fitBounds(NTT_BOUNDS, { padding: 55, duration: 0 });
      return;
    }
    if (features.features.length) {
      const bounds = new maplibregl.LngLatBounds();
      features.features.forEach((f) => bounds.extend(f.geometry.coordinates as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: 65, maxZoom: 10, duration: 0 });
    }
  }, [props.district, features, ready]);

  // Reset view to entire NTT
  function handleResetView() {
    props.onResetView();
    if (mapRef.current) {
      const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      mapRef.current.fitBounds(NTT_BOUNDS, { padding: 55, duration: isReducedMotion ? 0 : 400 });
    }
  }

  // Selected line object for floating card
  const selectedLineFeature = useMemo(() => {
    if (!props.selectedLine) return null;
    return allJourneys.features.find((f) => f.properties.id === props.selectedLine) || null;
  }, [props.selectedLine, allJourneys]);

  // Fit bounds to show complete origin-destination pair
  function handleFitCompleteLine(p: JourneyLineProperties, geomCoords: [number, number][]) {
    if (!mapRef.current || geomCoords.length < 2) return;
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bounds = new maplibregl.LngLatBounds();
    bounds.extend(geomCoords[0]);
    bounds.extend(geomCoords[1]);
    mapRef.current.fitBounds(bounds, { padding: getPadding(props.listOpen), maxZoom: 13, duration: isReducedMotion ? 0 : 450 });
  }

  const projection = geoMercator().fitExtent(
    [[35, 55], [Math.max(90, size.width - 35), Math.max(120, size.height - 55)]],
    props.data.boundary
  );
  const path = geoPath(projection);

  return (
    <div className="overview-map" aria-label="Peta indikasi episode rujukan NTT">
      <div
        ref={host}
        className="overview-map-canvas"
        aria-label="Peta interaktif; gunakan daftar episode sebagai alternatif navigasi"
      />

      {/* Fallback when WebGL is unavailable */}
      {(!ready || failed) && (
        <svg className="overview-map-fallback" viewBox={`0 0 ${size.width} ${size.height}`} aria-label="Peta NTT sederhana">
          {props.data.boundary.features.map((f, i) => (
            <path key={i} d={path(f) || ''} fill="#fafaf4" stroke="#9caf9f" />
          ))}
          {props.data.districts.features.map((f, i) => (
            <path key={i} d={path(f) || ''} fill="none" stroke="#b7c7b9" strokeWidth="0.7" />
          ))}
          {/* Fallback lines if origin selected */}
          {props.selectedOrigin &&
            allJourneys.features.map((jf) => {
              const [c1, c2] = jf.geometry.coordinates;
              const xy1 = projection(c1 as [number, number]);
              const xy2 = projection(c2 as [number, number]);
              if (!xy1 || !xy2) return null;
              return (
                <line
                  key={jf.properties.id}
                  x1={xy1[0]}
                  y1={xy1[1]}
                  x2={xy2[0]}
                  y2={xy2[1]}
                  stroke={jf.properties.color}
                  strokeWidth={jf.properties.lineWidth}
                  strokeDasharray="4 2"
                />
              );
            })}
          {features.features.map((f) => {
            const xy = projection(f.geometry.coordinates as [number, number]);
            if (!xy) return null;
            const p = f.properties;
            const isSel = props.selectedOrigin === p.origin;
            return (
              <g
                key={p.origin}
                transform={`translate(${xy[0]},${xy[1]})`}
                role="button"
                tabIndex={0}
                aria-label={`${p.name}: ${p.total} episode`}
                onClick={() => props.onOrigin(p.origin)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    props.onOrigin(p.origin);
                  }
                }}
              >
                <circle
                  r={isSel ? '10' : '8'}
                  fill={isSel ? '#166534' : p.red ? '#c74b40' : p.orange ? '#b57813' : '#258471'}
                  stroke="white"
                  strokeWidth="2"
                />
                <title>{p.name}: {p.total} episode</title>
              </g>
            );
          })}
        </svg>
      )}

      {/* Map Header Caption */}
      <div className="overview-map-caption">
        <MapPinned size={16} />
        <div>
          <strong>Nusa Tenggara Timur</strong>
          <span>
            {failed
              ? 'Peta sederhana · gunakan daftar untuk menelaah'
              : props.selectedOrigin
              ? 'Fokus fasilitas asal · Pilih garis untuk menelaah episode'
              : isLineMode
              ? 'Detail wilayah · Klik angka untuk memperbesar atau pilih garis rujukan'
              : 'Klik angka untuk memperbesar; pilih garis untuk menelaah episode'}
          </span>
        </div>
      </div>

      {/* Reset Map Button */}
      <button
        className="overview-reset-map"
        onClick={handleResetView}
        aria-label="Tampilkan seluruh NTT"
        title="Tampilkan seluruh NTT"
      >
        <Crosshair size={18} />
      </button>

      {/* Candidate Lines Picker (when click hits multiple overlapping lines) */}
      {candidateLines.length > 1 && (
        <div className="overview-line-picker" role="dialog" aria-label="Pilih garis rujukan">
          <div className="overview-line-picker-head">
            <span>Ditemukan {candidateLines.length} hubungan di titik ini:</span>
            <button onClick={() => setCandidateLines([])} aria-label="Tutup pemilih rute">
              <X size={14} />
            </button>
          </div>
          <div className="overview-line-picker-list">
            {candidateLines.map((id) => {
              const feat = allJourneys.features.find((f) => f.properties.id === id);
              if (!feat) return null;
              const p = feat.properties;
              return (
                <button
                  key={id}
                  className={`overview-line-picker-item ${props.selectedLine === id ? 'active' : ''}`}
                  onClick={() => {
                    props.onSelectLine(id);
                    setCandidateLines([]);
                  }}
                >
                  <span className="dot" style={{ backgroundColor: p.color }} />
                  <span className="label">
                    {p.fromName} → {p.toName}
                  </span>
                  <strong>{p.total} ep</strong>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Line Floating Card */}
      {selectedLineFeature && (
        <div className="overview-line-card" role="region" aria-label="Detail garis hubungan rujukan terpilih">
          <div className="overview-line-card-head">
            <span className="overview-line-card-badge">Garis asal–tujuan / proksi perjalanan</span>
            <button onClick={() => props.onSelectLine(null)} aria-label="Tutup detail garis">
              <X size={16} />
            </button>
          </div>
          <div className="overview-line-card-od">
            <div className="origin">
              <span className="role-tag asal">Asal</span>
              <strong>{formatFacilityName(selectedLineFeature.properties.fromName, 'asal')}</strong>
            </div>
            <ArrowRight size={15} className="arrow" />
            <div className="destination">
              <span className="role-tag tujuan">Tujuan</span>
              <strong>{formatFacilityName(selectedLineFeature.properties.toName, 'tujuan')}</strong>
            </div>
          </div>
          <div className="overview-line-card-meta">
            <div className="meta-stat">
              <strong>{formatNumber(selectedLineFeature.properties.total)}</strong>
              <span>episode rujukan</span>
            </div>
            <div className="meta-categories">
              {selectedLineFeature.properties.red > 0 && (
                <span className="cat-pill red">{selectedLineFeature.properties.red} tinggi</span>
              )}
              {selectedLineFeature.properties.orange > 0 && (
                <span className="cat-pill orange">{selectedLineFeature.properties.orange} sedang</span>
              )}
              {selectedLineFeature.properties.green > 0 && (
                <span className="cat-pill green">{selectedLineFeature.properties.green} rendah</span>
              )}
            </div>
          </div>
          <div className="overview-line-card-sub">
            {selectedLineFeature.properties.distM != null && (
              <span>Jarak: {(selectedLineFeature.properties.distM / 1000).toFixed(1)} km</span>
            )}
            {selectedLineFeature.properties.timeMin != null && (
              <span>Waktu proksi: {selectedLineFeature.properties.timeMin.toFixed(0)} mnt</span>
            )}
            {selectedLineFeature.properties.firstDate && (
              <span>Periode: {dateLabel(selectedLineFeature.properties.firstDate)}</span>
            )}
          </div>
          <div className="overview-line-card-actions">
            <button
              type="button"
              className="overview-line-action-fit"
              onClick={() =>
                handleFitCompleteLine(
                  selectedLineFeature.properties,
                  selectedLineFeature.geometry.coordinates as [number, number][]
                )
              }
            >
              Lihat hubungan lengkap
            </button>
            {selectedLineFeature.properties.total === 1 ? (
              <a
                href={investigationHref(
                  selectedLineFeature.properties.episodeIds[0],
                  new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
                )}
                className="overview-line-action-open"
              >
                Buka telaah episode <ExternalLink size={13} />
              </a>
            ) : (
              <span className="overview-line-card-hint">
                Pilih episode di panel untuk menelaah
              </span>
            )}
          </div>
        </div>
      )}

      {/* Guide text */}
      <div className="overview-map-guide">
        {isLineMode
          ? 'Garis = proksi perjalanan asal → tujuan (bukan rute fisik aktual) · Ketebalan = volume episode'
          : 'Angka = jumlah episode · Warna = komposisi indikasi simulasi'}
      </div>
    </div>
  );
}
