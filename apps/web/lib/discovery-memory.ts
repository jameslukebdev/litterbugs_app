import { DEFAULT_DISCOVERY_FILTERS, type DiscoveryFilters } from './report-discovery';
import type { SearchPlace } from './place-geography';
export type DiscoveryMemory = { latitude: number; longitude: number; zoom: number; place: SearchPlace | null };
export function readDiscoveryMemory(): DiscoveryMemory | null {
  try {
    const value = JSON.parse(sessionStorage.getItem('litterbugs.map.v1') ?? 'null') as DiscoveryMemory | null;
    if (!value || !Number.isFinite(value.latitude) || Math.abs(value.latitude) > 90 || !Number.isFinite(value.longitude) || Math.abs(value.longitude) > 180 || !Number.isFinite(value.zoom) || value.zoom < 3 || value.zoom > 22) return null;
    if (value.place && (typeof value.place.label !== 'string' || !Number.isFinite(value.place.latitude) || !Number.isFinite(value.place.longitude))) return null;
    return value;
  } catch { return null; }
}
export function saveDiscoveryMemory(value: DiscoveryMemory) { try { sessionStorage.setItem('litterbugs.map.v1', JSON.stringify(value)); } catch { /* Browsing works when storage is unavailable. */ } }
export type BrowserMemory = { filters: DiscoveryFilters; sort: 'newest' | 'closest' | 'reward-high' | 'severity'; scroll: number; displayLimit?: number };
export function readBrowserMemory(): BrowserMemory | null {
  try {
    const value = JSON.parse(sessionStorage.getItem('litterbugs.results.v1') ?? 'null') as BrowserMemory | null;
    if (!value || !value.filters || !['newest', 'closest', 'reward-high', 'severity'].includes(value.sort)) return null;
    const f = value.filters;
    if (!['all', 'available', 'progress', 'completed'].includes(f.status) || !['all', 'funded', 'volunteer'].includes(f.funding) || !['all', 'low', 'medium', 'high'].includes(f.severity) || ![0, 5, 25, 50].includes(f.radius) || !['all', 'favorites', 'hidden'].includes(f.scope) || typeof f.query !== 'string' || f.query.length > 1000) return null;
    return { ...value, filters: { ...DEFAULT_DISCOVERY_FILTERS, ...f }, displayLimit: Number.isFinite(value.displayLimit) ? Math.min(1000, Math.max(50, value.displayLimit!)) : 50, scroll: Number.isFinite(value.scroll) ? Math.max(0, value.scroll) : 0 };
  } catch { return null; }
}
export function saveBrowserMemory(value: BrowserMemory) { try { sessionStorage.setItem('litterbugs.results.v1', JSON.stringify(value)); } catch { /* Optional device memory. */ } }

/** Explicit URL state wins over device memory, including an intentionally cleared filter. */
export function readBrowserUrl(search: string): BrowserMemory | null {
  const p = new URLSearchParams(search);
  if (!p.has('browse')) return null;
  const pick = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => allowed.includes(p.get(key) as T) ? p.get(key) as T : fallback;
  return { filters: {
    status: pick('status', ['all', 'available', 'progress', 'completed'], 'all'),
    funding: pick('funding', ['all', 'funded', 'volunteer'], 'all'),
    severity: pick('severity', ['all', 'low', 'medium', 'high'], 'all'),
    scope: pick('scope', ['all', 'favorites', 'hidden'], 'all'),
    radius: Number(pick('radius', ['0', '5', '25', '50'], '0')) as DiscoveryFilters['radius'],
    query: (p.get('q') ?? '').slice(0, 1000),
  }, sort: pick('sort', ['newest', 'closest', 'reward-high', 'severity'], 'newest'), scroll: 0 };
}
export function browserUrl(url: URL, value: BrowserMemory) {
  const next = new URL(url);
  next.searchParams.set('browse', '1');
  for (const [key, valueAtKey] of Object.entries(value.filters)) {
    const param = key === 'query' ? 'q' : key;
    if (valueAtKey === DEFAULT_DISCOVERY_FILTERS[key as keyof DiscoveryFilters]) next.searchParams.delete(param);
    else next.searchParams.set(param, String(valueAtKey));
  }
  if (value.sort === 'newest') next.searchParams.delete('sort'); else next.searchParams.set('sort', value.sort);
  return `${next.pathname}${next.search}${next.hash}`;
}

export function readMapUrl(search: string): Omit<DiscoveryMemory, 'place'> | null {
  const params = new URLSearchParams(search);
  if (!params.has('lat') || !params.has('lng') || !params.has('zoom')) return null;
  const latitude = Number(params.get('lat')), longitude = Number(params.get('lng')), zoom = Number(params.get('zoom'));
  return Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180 && Number.isFinite(zoom) && zoom >= 3 && zoom <= 22 ? { latitude, longitude, zoom } : null;
}
export function mapUrl(url: URL, value: Omit<DiscoveryMemory, 'place'>) {
  const next = new URL(url);
  next.searchParams.set('lat', value.latitude.toFixed(3));
  next.searchParams.set('lng', value.longitude.toFixed(3));
  next.searchParams.set('zoom', value.zoom.toFixed(1));
  return `${next.pathname}${next.search}${next.hash}`;
}

/** Explicit links win; phones start on Map, like the native app. */
export function readDiscoveryView(search: string, mobile: boolean): 'map' | 'reports' {
  const view = new URLSearchParams(search).get('view');
  return view === 'map' || view === 'reports' ? view : mobile ? 'map' : 'reports';
}
