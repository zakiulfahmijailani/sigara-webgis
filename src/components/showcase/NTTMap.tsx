'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { GeoJSONSource, ImageSource, Map as LibreMap, StyleSpecification } from 'maplibre-gl';
import { geoMercator, geoPath } from 'd3-geo';
import { createPortal } from 'react-dom';
import FacilityPopup, { type MapPoint } from './FacilityPopup';
import type { FeatureCollection, Feature } from 'geojson';
import { Crosshair, Minus, Plus, MapPin, Layers, Eye, EyeOff, Sliders, Compass } from 'lucide-react';
import {
  categoryFromMaster,
  colors,
  labels,
  type Episode,
  type GeoAIImage,
  type ShowcaseData,
} from '@/lib/showcase';

type Props = {
  compact?: boolean;
  data: ShowcaseData;
  episodes: Episode[];
  selected: Episode | null;
  activeGeoAIImage: GeoAIImage | null;
  showOverlay: boolean;
  setShowOverlay: (v: boolean) => void;
  overlayOpacity: number;
  setOverlayOpacity: (v: number) => void;
  showSatelliteBackdrop: boolean;
  setShowSatelliteBackdrop: (v: boolean) => void;
  focusRequest: number;
  onSelect: (id: string) => void;
};

// Full NTT Archipelago bounds [minLon, minLat, maxLon, maxLat]
const NTT_BOUNDS: [number, number, number, number] = [118.92, -11.01, 125.2, -8.06];

export default function NTTMap(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const current = useRef(props);
  current.current = props;

  const [ready, setReady] = useState(false);
  const [styleVersion, setStyleVersion] = useState(0);
  const [mode, setMode] = useState('Peta lokal');
  const [size, setSize] = useState({ width: 700, height: 600 });
  const [activePoint, setActivePoint] = useState<MapPoint | null>(null);
  const [popupHost, setPopupHost] = useState<HTMLDivElement | null>(null);
  const [showRefFacilities, setShowRefFacilities] = useState(false);

  // SVG Fallback zoom
  const [fallbackZoom, setFallbackZoom] = useState(1);

  // Construct OD GeoJSON Features
  const mapFeatures = useMemo(() => {
    const sel = props.selected;
    const cat = sel ? categoryFromMaster(sel.cat) : 'red';
    const color = colors[cat];

    // OD line feature
    const odFeatures: Feature[] = [];
    if (sel && sel.fromLon != null && sel.fromLat != null && sel.toLon != null && sel.toLat != null) {
      odFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [sel.fromLon, sel.fromLat],
            [sel.toLon, sel.toLat],
          ],
        },
        properties: {
          id: sel.id,
          color,
          role: 'od-line',
          label: 'Garis OD / proksi akses',
        },
      });
    }

    // Alternative line feature (ONLY if alternative is within NTT and not outside)
    const altFeatures: Feature[] = [];
    if (
      sel &&
      !sel.altOutside &&
      sel.fromLon != null &&
      sel.fromLat != null &&
      sel.altLon != null &&
      sel.altLat != null
    ) {
      altFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [sel.fromLon, sel.fromLat],
            [sel.altLon, sel.altLat],
          ],
        },
        properties: {
          id: `${sel.id}-alt`,
          role: 'alt-line',
          label: 'Alternatif layak terdekat',
        },
      });
    }

    // Highlighted facility points
    const highlightedPoints: Feature[] = [];
    if (sel) {
      if (sel.fromLon != null && sel.fromLat != null) {
        highlightedPoints.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [sel.fromLon, sel.fromLat] },
          properties: {
            id: sel.fromId,
            nama: sel.fromName,
            role: 'asal',
            label: `Asal: ${sel.fromName}`,
            color: '#166534',
          },
        });
      }
      if (sel.toLon != null && sel.toLat != null) {
        highlightedPoints.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [sel.toLon, sel.toLat] },
          properties: {
            id: sel.toId,
            nama: sel.toName,
            role: 'tujuan',
            label: `Tujuan: ${sel.toName}`,
            color,
          },
        });
      }
      if (!sel.altOutside && sel.altLon != null && sel.altLat != null && sel.altId) {
        highlightedPoints.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [sel.altLon, sel.altLat] },
          properties: {
            id: sel.altId,
            nama: sel.altName || sel.altId,
            role: 'alternatif',
            label: `Alternatif: ${sel.altName || sel.altId}`,
            color: '#2563eb',
          },
        });
      }
    }

    return {
      od: { type: 'FeatureCollection', features: odFeatures } as FeatureCollection,
      alt: { type: 'FeatureCollection', features: altFeatures } as FeatureCollection,
      highlighted: { type: 'FeatureCollection', features: highlightedPoints } as FeatureCollection,
    };
  }, [props.selected]);

  // Fit bounds to selected episode
  const focusSelectedCase = (map: LibreMap, duration = 650) => {
    const sel = current.current.selected;
    if (!sel) {
      map.fitBounds(NTT_BOUNDS, { padding: 40, duration });
      return;
    }

    const extent = new maplibregl.LngLatBounds();
    let hasPoints = false;

    if (sel.fromLon != null && sel.fromLat != null) {
      extent.extend([sel.fromLon, sel.fromLat]);
      hasPoints = true;
    }
    if (sel.toLon != null && sel.toLat != null) {
      extent.extend([sel.toLon, sel.toLat]);
      hasPoints = true;
    }
    if (!sel.altOutside && sel.altLon != null && sel.altLat != null) {
      extent.extend([sel.altLon, sel.altLat]);
      hasPoints = true;
    }

    // If GeoAI image active, include its bounds
    if (current.current.activeGeoAIImage) {
      const b = current.current.activeGeoAIImage.boundsWgs84;
      extent.extend([b[0], b[1]]);
      extent.extend([b[2], b[3]]);
      hasPoints = true;
    }

    if (hasPoints) {
      map.fitBounds(extent, {
        padding: { top: 90, bottom: 90, left: 60, right: 60 },
        maxZoom: 13,
        duration,
      });
    } else {
      map.fitBounds(NTT_BOUNDS, { padding: 40, duration });
    }
  };

  // Synchronize GeoAI image overlay on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const img = props.activeGeoAIImage;
    const overlayId = 'geoai-overlay-source';
    const overlayLayerId = 'geoai-overlay-layer';
    const backdropId = 'geoai-backdrop-source';
    const backdropLayerId = 'geoai-backdrop-layer';

    // Remove existing layers and sources first
    if (map.getLayer(overlayLayerId)) map.removeLayer(overlayLayerId);
    if (map.getSource(overlayId)) map.removeSource(overlayId);
    if (map.getLayer(backdropLayerId)) map.removeLayer(backdropLayerId);
    if (map.getSource(backdropId)) map.removeSource(backdropId);

    if (!img) return;

    try {
      // 1. Add Satellite Backdrop crop if toggled on
      if (props.showSatelliteBackdrop && img.latar) {
        map.addSource(backdropId, {
          type: 'image',
          url: img.latar,
          coordinates: img.corners,
        });

        // Insert below district outlines or overlay
        const beforeLayer = map.getLayer('district-outlines') ? 'district-outlines' : undefined;
        map.addLayer(
          {
            id: backdropLayerId,
            type: 'raster',
            source: backdropId,
            paint: { 'raster-opacity': 0.9 },
          },
          beforeLayer
        );
      }

      // 2. Add Transparent Analysis Raster Overlay if toggled on
      if (props.showOverlay && img.overlay) {
        map.addSource(overlayId, {
          type: 'image',
          url: img.overlay,
          coordinates: img.corners,
        });

        // Add layer with nearest-neighbor resampling for analysis grid
        // Insert before highlighted points / OD lines to keep vectors on top
        const beforeVector = map.getLayer('od-line-halo') ? 'od-line-halo' : undefined;
        map.addLayer(
          {
            id: overlayLayerId,
            type: 'raster',
            source: overlayId,
            paint: {
              'raster-opacity': props.overlayOpacity,
              'raster-resampling': 'nearest',
            },
          },
          beforeVector
        );
      }
    } catch (err) {
      console.warn('[NTTMap] Error loading raster overlay:', err);
    }
  }, [
    ready,
    styleVersion,
    props.activeGeoAIImage,
    props.showOverlay,
    props.overlayOpacity,
    props.showSatelliteBackdrop,
  ]);

  // Handle map initialization
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
      mapRef.current?.resize();
    });
    observer.observe(host.current);

    const controller = new AbortController();
    let alive = true;
    let map: LibreMap | undefined;

    // Local style with NTT boundary and districts
    const localStyle: StyleSpecification = {
      version: 8,
      sources: {
        'ntt-boundary': { type: 'geojson', data: props.data.boundary },
        'ntt-districts': { type: 'geojson', data: props.data.districts },
        'facilities-ref': { type: 'geojson', data: props.data.facilities },
      },
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#e8f0eb' } },
        {
          id: 'ntt-land',
          type: 'fill',
          source: 'ntt-boundary',
          paint: { 'fill-color': '#fbfcf8', 'fill-opacity': 0.9 },
        },
        {
          id: 'district-fills',
          type: 'fill',
          source: 'ntt-districts',
          paint: { 'fill-color': '#ecf3ed', 'fill-opacity': 0.4 },
        },
        {
          id: 'district-outlines',
          type: 'line',
          source: 'ntt-districts',
          paint: { 'line-color': '#9eb8aa', 'line-width': 0.8, 'line-dasharray': [3, 2] },
        },
        {
          id: 'ntt-outline',
          type: 'line',
          source: 'ntt-boundary',
          paint: { 'line-color': '#3b6e58', 'line-width': 1.8 },
        },
      ],
    };

    function setupDataLayers() {
      if (!map || !alive) return;

      // Add dynamic sources for OD, alternative, and highlighted facilities
      if (!map.getSource('od-source')) {
        map.addSource('od-source', { type: 'geojson', data: mapFeatures.od });
      }
      if (!map.getSource('alt-source')) {
        map.addSource('alt-source', { type: 'geojson', data: mapFeatures.alt });
      }
      if (!map.getSource('highlight-source')) {
        map.addSource('highlight-source', { type: 'geojson', data: mapFeatures.highlighted });
      }

      // Add boundary / district / facility sources if not present (e.g. if remote style loaded)
      if (!map.getSource('ntt-boundary')) {
        map.addSource('ntt-boundary', { type: 'geojson', data: props.data.boundary });
      }
      if (!map.getSource('ntt-districts')) {
        map.addSource('ntt-districts', { type: 'geojson', data: props.data.districts });
      }
      if (!map.getSource('facilities-ref')) {
        map.addSource('facilities-ref', { type: 'geojson', data: props.data.facilities });
      }

      // Province and district outlines on top of basemap
      if (!map.getLayer('ntt-boundary-tint')) {
        map.addLayer({
          id: 'ntt-boundary-tint',
          type: 'fill',
          source: 'ntt-boundary',
          paint: { 'fill-color': '#3b7e65', 'fill-opacity': 0.04 },
        });
      }
      if (!map.getLayer('district-outlines')) {
        map.addLayer({
          id: 'district-outlines',
          type: 'line',
          source: 'ntt-districts',
          paint: { 'line-color': '#759b8a', 'line-width': 0.8, 'line-dasharray': [4, 3] },
        });
      }
      if (!map.getLayer('ntt-prov-outline')) {
        map.addLayer({
          id: 'ntt-prov-outline',
          type: 'line',
          source: 'ntt-boundary',
          paint: { 'line-color': '#2a634e', 'line-width': 1.6 },
        });
      }

      // Reference facilities (all 879 records)
      if (!map.getLayer('facilities-ref-layer')) {
        map.addLayer({
          id: 'facilities-ref-layer',
          type: 'circle',
          source: 'facilities-ref',
          layout: { visibility: 'none' },
          paint: {
            'circle-color': '#718c81',
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              6,
              2.5,
              9,
              4,
              12,
              6.5,
            ],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
            'circle-opacity': 0.75,
          },
        });
      }

      // Alternative dashed line
      if (!map.getLayer('alt-line-halo')) {
        map.addLayer({
          id: 'alt-line-halo',
          type: 'line',
          source: 'alt-source',
          paint: { 'line-color': '#ffffff', 'line-width': 5, 'line-opacity': 0.8 },
        });
        map.addLayer({
          id: 'alt-line',
          type: 'line',
          source: 'alt-source',
          paint: {
            'line-color': '#2563eb',
            'line-width': 2.5,
            'line-dasharray': [3, 2],
          },
        });
      }

      // OD Proxy dashed line
      if (!map.getLayer('od-line-halo')) {
        map.addLayer({
          id: 'od-line-halo',
          type: 'line',
          source: 'od-source',
          paint: { 'line-color': '#ffffff', 'line-width': 6, 'line-opacity': 0.9 },
        });
        map.addLayer({
          id: 'od-line',
          type: 'line',
          source: 'od-source',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 3.5,
            'line-dasharray': [4, 2.5],
          },
        });
      }

      // Highlighted case facilities (Origin, Destination, Alternative)
      if (!map.getLayer('highlight-halos')) {
        map.addLayer({
          id: 'highlight-halos',
          type: 'circle',
          source: 'highlight-source',
          paint: {
            'circle-radius': 16,
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.22,
          },
        });
        map.addLayer({
          id: 'highlight-pins',
          type: 'circle',
          source: 'highlight-source',
          paint: {
            'circle-radius': 8,
            'circle-color': ['get', 'color'],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2.5,
          },
        });
      }

      setReady(true);
      setStyleVersion(version => version + 1);
      focusSelectedCase(map, 0);
    }

    try {
      map = new maplibregl.Map({
        container: host.current,
        style: localStyle,
        bounds: NTT_BOUNDS,
        fitBoundsOptions: { padding: 32 },
        attributionControl: false,
      });
      mapRef.current = map;

      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution:
            'GADM 4.1 · <a href="https://s2maps.eu" target="_blank" rel="noopener noreferrer">Sentinel-2 Cloudless (EOX)</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OSM</a>',
        }),
        'bottom-right'
      );

      map.on('style.load', setupDataLayers);

      // Facility click handling
      map.on('click', (e) => {
        if (!map) return;
        const area: [[number, number], [number, number]] = [
          [e.point.x - 10, e.point.y - 10],
          [e.point.x + 10, e.point.y + 10],
        ];

        const layers = ['highlight-pins', 'facilities-ref-layer'].filter((id) =>
          map!.getLayer(id)
        );
        const hits = map.queryRenderedFeatures(area, { layers });

        if (hits.length > 0 && hits[0].properties?.id) {
          const fid = String(hits[0].properties.id);
          const geom = hits[0].geometry as GeoJSON.Point;
          const coords = geom.coordinates;

          // Find from full reference or properties
          const propsData = hits[0].properties;
          setActivePoint({
            id: fid,
            nama: propsData.nama || `Faskes ${fid}`,
            peran: propsData.peran,
            kelompok: propsData.kelompok,
            kabkota: propsData.kabkota,
            peranVerif: Boolean(propsData.peranVerif),
            existVerif: Boolean(propsData.existVerif),
            lon: coords[0],
            lat: coords[1],
          });
        } else {
          setActivePoint(null);
        }
      });

      // Cursor pointer on hover
      map.on('mousemove', (e) => {
        if (!map) return;
        const layers = ['highlight-pins', 'facilities-ref-layer', 'od-line'].filter((id) =>
          map!.getLayer(id)
        );
        const hits = map.queryRenderedFeatures(
          [
            [e.point.x - 8, e.point.y - 8],
            [e.point.x + 8, e.point.y + 8],
          ],
          { layers }
        );
        map.getCanvas().style.cursor = hits.length ? 'pointer' : '';
      });

      map.on('mouseleave', () => {
        if (map) map.getCanvas().style.cursor = '';
      });

      // Try loading remote OpenFreeMap Positron basemap
      fetch('https://tiles.openfreemap.org/styles/positron', {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(6000)]),
      })
        .then((r) => {
          if (!r.ok) throw Error();
          return r.json();
        })
        .then((style: StyleSpecification) => {
          if (alive && map) {
            map.setStyle(style);
            setMode('OpenFreeMap · Positron');
          }
        })
        .catch(() => {
          if (alive) setMode('Peta lokal · GADM NTT');
        });
    } catch {
      setMode('Peta lokal · GADM NTT');
    }

    return () => {
      alive = false;
      controller.abort();
      observer.disconnect();
      map?.remove();
      mapRef.current = null;
    };
  }, [props.data]);

  // Update dynamic feature data when selected episode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    (map.getSource('od-source') as GeoJSONSource | undefined)?.setData(mapFeatures.od);
    (map.getSource('alt-source') as GeoJSONSource | undefined)?.setData(mapFeatures.alt);
    (map.getSource('highlight-source') as GeoJSONSource | undefined)?.setData(
      mapFeatures.highlighted
    );
  }, [mapFeatures, ready, styleVersion]);

  // Toggle reference facilities layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (map.getLayer('facilities-ref-layer')) {
      map.setLayoutProperty(
        'facilities-ref-layer',
        'visibility',
        showRefFacilities ? 'visible' : 'none'
      );
    }
  }, [showRefFacilities, ready, styleVersion]);

  // Case focus change triggers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    focusSelectedCase(map, 600);
    setFallbackZoom(1);
  }, [props.selected?.id, props.focusRequest, ready, styleVersion]);

  // Popup lifecycle
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !activePoint) return;

    const content = document.createElement('div');
    const popup = new maplibregl.Popup({
      closeOnClick: false,
      maxWidth: '320px',
      offset: 14,
      className: 'sigara-facility-popup',
    })
      .setLngLat([activePoint.lon, activePoint.lat])
      .setDOMContent(content)
      .addTo(map);

    popup.getElement().setAttribute('role', 'dialog');
    popup.getElement().setAttribute('aria-label', 'Informasi fasilitas');

    const update = () => popup.setLngLat([activePoint.lon, activePoint.lat]);
    map.on('move', update);

    const close = () => setActivePoint(null);
    popup.on('close', close);

    setPopupHost(content);

    return () => {
      map.off('move', update);
      popup.off('close', close);
      popup.remove();
      setPopupHost(null);
    };
  }, [activePoint, ready]);

  // D3-geo SVG Fallback projection for NTT
  const projection = geoMercator().fitExtent(
    [
      [24, 24],
      [Math.max(80, size.width - 24), Math.max(90, size.height - 40)],
    ],
    props.data.boundary
  );
  const path = geoPath(projection);

  function zoom(delta: number) {
    if (mapRef.current) {
      mapRef.current.zoomTo(mapRef.current.getZoom() + delta);
    } else {
      setFallbackZoom((x) => Math.max(0.8, Math.min(3, x + delta * 0.3)));
    }
  }

  function resetNTT() {
    if (mapRef.current) {
      mapRef.current.fitBounds(NTT_BOUNDS, { padding: 36, duration: 600 });
    }
    setFallbackZoom(1);
    setActivePoint(null);
  }

  const sel = props.selected;
  const selCat = sel ? categoryFromMaster(sel.cat) : 'red';

  return (
    <div className="map-surface">
      <div ref={host} className="map-canvas" aria-label="Peta interaktif Kepulauan NTT" />

      {/* SVG Fallback when WebGL is unavailable */}
      {!ready && (
        <svg
          className="map-fallback interactive-fallback"
          viewBox={`0 0 ${size.width} ${size.height}`}
          role="img"
          aria-label="Peta fallback Provinsi NTT"
        >
          <g
            transform={`translate(${size.width / 2} ${size.height / 2}) scale(${fallbackZoom}) translate(${-size.width / 2} ${-size.height / 2})`}
          >
            <path d={path(props.data.boundary) ?? ''} fill="#f4f8f4" stroke="#3b6e58" strokeWidth="1.5" />
            <path d={path(props.data.districts) ?? ''} fill="none" stroke="#90b0a0" strokeWidth="0.8" strokeDasharray="3 2" />

            {/* Selected OD line */}
            {sel && sel.fromLon != null && sel.fromLat != null && sel.toLon != null && sel.toLat != null && (
              <line
                x1={projection([sel.fromLon, sel.fromLat])?.[0] ?? 0}
                y1={projection([sel.fromLon, sel.fromLat])?.[1] ?? 0}
                x2={projection([sel.toLon, sel.toLat])?.[0] ?? 0}
                y2={projection([sel.toLon, sel.toLat])?.[1] ?? 0}
                stroke={colors[selCat]}
                strokeWidth="3.5"
                strokeDasharray="4 3"
              />
            )}

            {/* Selected Origin */}
            {sel && sel.fromLon != null && sel.fromLat != null && (
              <circle
                cx={projection([sel.fromLon, sel.fromLat])?.[0] ?? 0}
                cy={projection([sel.fromLon, sel.fromLat])?.[1] ?? 0}
                r="7"
                fill="#166534"
                stroke="#ffffff"
                strokeWidth="2"
              />
            )}

            {/* Selected Destination */}
            {sel && sel.toLon != null && sel.toLat != null && (
              <circle
                cx={projection([sel.toLon, sel.toLat])?.[0] ?? 0}
                cy={projection([sel.toLon, sel.toLat])?.[1] ?? 0}
                r="8"
                fill={colors[selCat]}
                stroke="#ffffff"
                strokeWidth="2"
              />
            )}
          </g>
        </svg>
      )}

      {/* Portal for popup */}
      {activePoint &&
        popupHost &&
        createPortal(
          <FacilityPopup
            point={activePoint}
            data={props.data}
            selected={props.selected}
            episodes={props.episodes}
            onOpenPoint={(p) => setActivePoint(p)}
          />,
          popupHost
        )}

      {/* Location Badge */}
      {!props.compact && <div className="map-location">
        <MapPin size={15} />
        <div>
          <strong>Kepulauan Nusa Tenggara Timur</strong>
          <span>Cakupan Provinsi · {props.data.districts.features.length} wilayah · {props.data.summary.totals.facilitiesReference} faskes</span>
        </div>
        <span className="map-location-dot" />
      </div>}

      {/* Selected Case Notification Strip */}
      {props.selected && !props.compact && (
        <div className="map-selected-case" role="status" aria-live="polite">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <span className={`status-dot ${selCat}`} />
            <strong>Episode {props.selected.id}</strong>
            <span style={{ fontSize: '10px', color: '#688070' }}>
              ({props.selected.kabAsal} → {props.selected.kabTujuan})
            </span>
            {props.selected.hasGeoAI && (
              <span
                style={{
                  marginLeft: 'auto',
                  background: '#e0f2fe',
                  color: '#0369a1',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '9px',
                  fontWeight: 600,
                }}
              >
                🛰️ Bukti GeoAI Tersedia
              </span>
            )}
          </div>
          <span>
            {props.selected.fromName} → {props.selected.toName}
          </span>
          <small>
            Garis putus-putus: Garis OD / proksi akses (jarak {props.selected.distM ? `${(props.selected.distM / 1000).toFixed(1)} km` : '—'}, waktu {props.selected.timeMin?.toFixed(1)} mnt)
            {props.selected.altOutside && ' · ⚠️ Alternatif terdekat berada di luar cakupan NTT (NTB)'}
          </small>
        </div>
      )}

      {/* Map Controls */}
      <div className="map-controls">
        <button aria-label="Perbesar peta" onClick={() => zoom(1)} title="Perbesar">
          <Plus size={17} />
        </button>
        <button aria-label="Perkecil peta" onClick={() => zoom(-1)} title="Perkecil">
          <Minus size={17} />
        </button>
        <button
          aria-label="Kembali ke tampilan NTT"
          onClick={resetNTT}
          title="Kembali ke NTT (Reset pandangan)"
        >
          <Compass size={17} />
        </button>
        {props.selected && (
          <button
            aria-label="Fokus ke kasus terpilih"
            onClick={() => mapRef.current && focusSelectedCase(mapRef.current, 500)}
            title="Fokus ke kasus terpilih"
          >
            <Crosshair size={17} />
          </button>
        )}
      </div>

      {/* Layer controls are disclosed when requested. */}
      <details className="case-map-layers">
        <summary><Layers size={15} /> Lapisan peta</summary>
        <div className="case-map-layer-options">
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showRefFacilities}
            onChange={(e) => setShowRefFacilities(e.target.checked)}
          />
          <span>Referensi faskes ({props.data.summary.totals.facilitiesReference})</span>
        </label>

        {props.activeGeoAIImage && (
          <>
            <span style={{ height: '14px', width: '1px', background: '#dce4d9' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={props.showOverlay}
                onChange={(e) => props.setShowOverlay(e.target.checked)}
              />
              <span>Overlay GeoAI</span>
            </label>
            {props.showOverlay && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sliders size={12} style={{ color: '#688070' }} />
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={props.overlayOpacity}
                  onChange={(e) => props.setOverlayOpacity(parseFloat(e.target.value))}
                  style={{ width: '50px', height: '4px' }}
                  title={`Opasitas: ${Math.round(props.overlayOpacity * 100)}%`}
                />
              </div>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={props.showSatelliteBackdrop}
                onChange={(e) => props.setShowSatelliteBackdrop(e.target.checked)}
              />
              <span>Latar Sentinel-2</span>
            </label>
          </>
        )}
        </div>
      </details>

      {/* Map Legend */}
      <div className="map-key">
        <span>
          <i style={{ width: 8, height: 8, background: '#166534', borderRadius: '50%', display: 'inline-block' }} />
          FKTP Asal
        </span>
        <span>
          <i style={{ width: 8, height: 8, background: colors[selCat], borderRadius: '50%', display: 'inline-block', border: '1px solid #fff' }} />
          Tujuan Terpilih
        </span>
        <span>
          <i style={{ width: 8, height: 8, background: '#2563eb', borderRadius: '50%', display: 'inline-block' }} />
          Alternatif Terdekat
        </span>
        <span>
          <i style={{ width: 14, height: 2, background: colors[selCat], display: 'inline-block', verticalAlign: 'middle' }} />
          Garis OD (proksi akses)
        </span>
        {showRefFacilities && <span>
          <i style={{ width: 6, height: 6, background: '#718c81', borderRadius: '50%', display: 'inline-block' }} />
          Referensi faskes
        </span>}
        {props.activeGeoAIImage && props.showOverlay && (
          <span style={{ color: '#0369a1', fontWeight: 600 }}>
            <i style={{ width: 10, height: 10, background: 'rgba(3,105,161,0.4)', border: '1px solid #0369a1', display: 'inline-block' }} />
            Overlay GeoAI Sintetis ({props.activeGeoAIImage.scenario})
          </span>
        )}
      </div>

      {/* Map Source Info */}
      <div className="map-source">
        <Layers size={11} />
        {mode} · Sentinel-2 2024 (EOX) · Simulasi POC
      </div>
    </div>
  );
}
