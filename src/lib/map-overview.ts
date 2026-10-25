import { categoryFromMaster, type Episode, type Filter } from './showcase';
import type { FeatureCollection, Point } from 'geojson';

export const NTT_BOUNDS: [number, number, number, number] = [118.92, -11.01, 125.2, -8.06];
export type Camera = { lng: number; lat: number; zoom: number };
export type MapFilters = { category: Filter; query: string; district: string; month: string; geoai: boolean; origin: string };
export const districtLabel = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2');

export function readMapFilters(params: URLSearchParams): MapFilters {
  const cat = params.get('cat');
  return {
    category: cat === 'red' || cat === 'orange' || cat === 'green' ? cat : 'all',
    query: params.get('q') || '', district: params.get('district') || 'all',
    month: params.get('month') || 'all', geoai: params.get('geoai') === '1', origin: params.get('origin') || '',
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
