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
export type BrowserMemory = { filters: DiscoveryFilters; sort: 'newest' | 'closest' | 'reward-high' | 'severity'; scroll: number };
export function readBrowserMemory(): BrowserMemory | null {
  try {
    const value = JSON.parse(sessionStorage.getItem('litterbugs.results.v1') ?? 'null') as BrowserMemory | null;
    if (!value || !value.filters || !['newest', 'closest', 'reward-high', 'severity'].includes(value.sort)) return null;
    const f = value.filters;
    if (!['all', 'available', 'progress', 'completed'].includes(f.status) || !['all', 'funded', 'volunteer'].includes(f.funding) || !['all', 'low', 'medium', 'high'].includes(f.severity) || ![0, 5, 25, 50].includes(f.radius) || !['all', 'favorites', 'hidden'].includes(f.scope) || typeof f.query !== 'string' || f.query.length > 1000) return null;
    return { ...value, filters: { ...DEFAULT_DISCOVERY_FILTERS, ...f }, scroll: Number.isFinite(value.scroll) ? Math.max(0, value.scroll) : 0 };
  } catch { return null; }
}
export function saveBrowserMemory(value: BrowserMemory) { try { sessionStorage.setItem('litterbugs.results.v1', JSON.stringify(value)); } catch { /* Optional device memory. */ } }
