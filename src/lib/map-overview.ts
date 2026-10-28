import { categoryFromMaster, type Episode, type Filter } from './showcase';
import type { FeatureCollection, Feature, Point, LineString } from 'geojson';

export const NTT_BOUNDS: [number, number, number, number] = [118.92, -11.01, 125.2, -8.06];
export type Camera = { lng: number; lat: number; zoom: number };
export type MapFilters = { category: Filter; query: string; district: string; month: string; geoai: boolean; origin: string; line: string };
export const districtLabel = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2');

export function readMapFilters(params: URLSearchParams): MapFilters {
  const cat = params.get('cat');
  return {
    category: cat === 'red' || cat === 'orange' || cat === 'green' ? cat : 'all',
    query: params.get('q') || '', district: params.get('district') || 'all',
    month: params.get('month') || 'all', geoai: params.get('geoai') === '1', origin: params.get('origin') || '',
    line: params.get('line') || '',
  };
}

export function readCamera(params: URLSearchParams): Camera | null {
  if (!['lng', 'lat', 'z'].every(key => params.has(key))) return null;
  const [lng, lat, zoom] = ['lng', 'lat', 'z'].map(key => Number(params.get(key)));
  return [lng, lat, zoom].every(Number.isFinite) && lng >= 117 && lng <= 127 && lat >= -13 && lat <= -6 && zoom >= 4 && zoom <= 16
    ? { lng, lat, zoom } : null;
}

export function filterMapEpisodes(episodes: Episode[], filters: MapFilters, includeCategory = true): Episode[] {
  const query = filters.query.trim().toLocaleLowerCase('id');
  return episodes.filter(ep =>
    (!includeCategory || filters.category === 'all' || categoryFromMaster(ep.cat) === filters.category) &&
    (filters.district === 'all' || ep.kabAsal === filters.district) &&
    (filters.month === 'all' || ep.month === filters.month) &&
    (!filters.geoai || ep.hasGeoAI) &&
    (!query || [ep.id, ep.fromId, ep.toId, ep.fromName, ep.toName, districtLabel(ep.kabAsal), districtLabel(ep.kabTujuan)].some(v => v.toLocaleLowerCase('id').includes(query)))
  );
}

export function episodeCounts(episodes: Episode[]) {
  const counts = { all: episodes.length, red: 0, orange: 0, green: 0 };
  episodes.forEach(ep => counts[categoryFromMaster(ep.cat)]++);
  return counts;
}

export type OriginProperties = { origin: string; name: string; total: number; red: number; orange: number; green: number };
export function originFeatures(episodes: Episode[]): FeatureCollection<Point, OriginProperties> {
  const groups = new Map<string, FeatureCollection<Point, OriginProperties>['features'][number]>();
  for (const ep of episodes) {
    if (ep.fromLon == null || ep.fromLat == null || !Number.isFinite(ep.fromLon) || !Number.isFinite(ep.fromLat)) continue;
    let feature = groups.get(ep.fromId);
    if (!feature) {
      feature = { type: 'Feature', geometry: { type: 'Point', coordinates: [ep.fromLon, ep.fromLat] }, properties: { origin: ep.fromId, name: ep.fromName, total: 0, red: 0, orange: 0, green: 0 } };
      groups.set(ep.fromId, feature);
    }
    feature.properties.total++;
    feature.properties[categoryFromMaster(ep.cat)]++;
  }
  return { type: 'FeatureCollection', features: [...groups.values()] };
}

export type JourneyCategory = 'red' | 'orange' | 'green' | 'mixed';
export type JourneyLineProperties = {
  id: string; // `${fromId}__${toId}`
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  total: number;
  red: number;
  orange: number;
  green: number;
  category: JourneyCategory;
  color: string;
  lineWidth: number;
  distM: number | null;
  timeMin: number | null;
  firstDate: string | null;
  lastDate: string | null;
  episodeIds: string[];
  label: string;
};

export function journeyFeatures(
  episodes: Episode[],
  selectedOrigin?: string | null
): FeatureCollection<LineString, JourneyLineProperties> {
  const targetEpisodes = selectedOrigin
    ? episodes.filter(ep => ep.fromId === selectedOrigin)
    : episodes;

  const groups = new Map<string, {
    fromId: string;
    fromName: string;
    fromLon: number;
    fromLat: number;
    toId: string;
    toName: string;
    toLon: number;
    toLat: number;
    episodes: Episode[];
    total: number;
    red: number;
    orange: number;
    green: number;
    distM: number | null;
    timeMin: number | null;
  }>();

  for (const ep of targetEpisodes) {
    if (
      ep.fromLon == null || ep.fromLat == null ||
      ep.toLon == null || ep.toLat == null ||
      !Number.isFinite(ep.fromLon) || !Number.isFinite(ep.fromLat) ||
      !Number.isFinite(ep.toLon) || !Number.isFinite(ep.toLat) ||
      (ep.fromLon === 0 && ep.fromLat === 0) ||
      (ep.toLon === 0 && ep.toLat === 0) ||
      (ep.fromLon === ep.toLon && ep.fromLat === ep.toLat)
    ) {
      continue;
    }

    const key = `${ep.fromId}__${ep.toId}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        fromId: ep.fromId,
        fromName: ep.fromName,
        fromLon: ep.fromLon,
        fromLat: ep.fromLat,
        toId: ep.toId,
        toName: ep.toName,
        toLon: ep.toLon,
        toLat: ep.toLat,
        episodes: [],
        total: 0,
        red: 0,
        orange: 0,
        green: 0,
        distM: ep.distM ?? null,
        timeMin: ep.timeMin ?? null,
      };
      groups.set(key, group);
    }

    group.total++;
    group.episodes.push(ep);
    const cat = categoryFromMaster(ep.cat);
    group[cat]++;
  }

  const features: Feature<LineString, JourneyLineProperties>[] = [];

  for (const [key, g] of groups) {
    let category: JourneyCategory = 'mixed';
    let color = '#477669'; // neutral slate teal for mixed
    if (g.red > 0 && g.orange === 0 && g.green === 0) {
      category = 'red';
      color = '#c74b40';
    } else if (g.orange > 0 && g.red === 0 && g.green === 0) {
      category = 'orange';
      color = '#b57813';
    } else if (g.green > 0 && g.red === 0 && g.orange === 0) {
      category = 'green';
      color = '#258471';
    }

    // Limit line width between 2.6 and 5.6 to reflect volume without obscuring map
    const lineWidth = g.total <= 1 ? 2.6 : g.total <= 4 ? 3.4 : g.total <= 14 ? 4.4 : 5.6;

    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [g.fromLon, g.fromLat],
          [g.toLon, g.toLat],
        ],
      },
      properties: {
        id: key,
        fromId: g.fromId,
        fromName: g.fromName,
        toId: g.toId,
        toName: g.toName,
        total: g.total,
        red: g.red,
        orange: g.orange,
        green: g.green,
        category,
        color,
        lineWidth,
        distM: g.distM,
        timeMin: g.timeMin,
        firstDate: g.episodes[0]?.firstDate ?? null,
        lastDate: g.episodes[g.episodes.length - 1]?.lastDate ?? null,
        episodeIds: g.episodes.map(e => e.id),
        label: `${g.fromName} → ${g.toName}`,
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

export type EndpointProperties = {
  id: string;
  name: string;
  role: 'origin' | 'destination';
  total: number;
  red: number;
  orange: number;
  green: number;
  color: string;
};

export function endpointFeatures(
  journeys: FeatureCollection<LineString, JourneyLineProperties>
): FeatureCollection<Point, EndpointProperties> {
  const points = new Map<string, Feature<Point, EndpointProperties>>();

  for (const f of journeys.features) {
    const coords = f.geometry.coordinates;
    const p = f.properties;

    // Origin point
    const originKey = `orig-${p.fromId}`;
    if (!points.has(originKey)) {
      points.set(originKey, {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords[0] as [number, number] },
        properties: {
          id: p.fromId,
          name: p.fromName,
          role: 'origin',
          total: 0,
          red: 0,
          orange: 0,
          green: 0,
          color: '#166534',
        },
      });
    }
    const orig = points.get(originKey)!;
    orig.properties.total += p.total;
    orig.properties.red += p.red;
    orig.properties.orange += p.orange;
    orig.properties.green += p.green;

    // Destination point
    const destKey = `dest-${p.toId}`;
    if (!points.has(destKey)) {
      points.set(destKey, {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords[1] as [number, number] },
        properties: {
          id: p.toId,
          name: p.toName,
          role: 'destination',
          total: 0,
          red: 0,
          orange: 0,
          green: 0,
          color: p.color,
        },
      });
    }
    const dest = points.get(destKey)!;
    dest.properties.total += p.total;
    dest.properties.red += p.red;
    dest.properties.orange += p.orange;
    dest.properties.green += p.green;
  }

  return { type: 'FeatureCollection', features: [...points.values()] };
}

export function investigationHref(id: string, params: URLSearchParams) {
  const next = new URLSearchParams(params);
  next.set('from', 'map');
  next.delete('tab');
  return `/episode/${encodeURIComponent(id)}?${next.toString()}`;
}

export function investigationBackHref(params: URLSearchParams) {
  const next = new URLSearchParams(params);
  const base = next.get('from') === 'map' ? '/' : '/episode';
  next.delete('tab'); next.delete('from');
  return `${base}${next.size ? `?${next.toString()}` : ''}`;
}
