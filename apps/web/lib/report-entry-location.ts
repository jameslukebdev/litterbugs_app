import type { Coordinates } from '@litterbugs/report-contract';

// A map viewport is not a confirmed report pin. Carry the explicit selection
// separately so it survives an email/OAuth return or an external-browser handoff.
export function readReportEntryLocation(params: URLSearchParams): Coordinates | null {
  if (params.getAll('report_lat').length !== 1 || params.getAll('report_lng').length !== 1) return null;
  const lat = params.get('report_lat')!;
  const lng = params.get('report_lng')!;
  if (!lat.trim() || !lng.trim()) return null;
  const latitude = Number(lat), longitude = Number(lng);
  return Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180
    ? { latitude, longitude } : null;
}

export function reportEntryLocationHref(current: URL, coordinates: Coordinates): string {
  const url = new URL(current);
  url.pathname = '/report';
  url.searchParams.delete('report');
  url.searchParams.delete('intent');
  url.searchParams.delete('compose');
  url.searchParams.set('view', 'map');
  url.searchParams.set('report_lat', String(coordinates.latitude));
  url.searchParams.set('report_lng', String(coordinates.longitude));
  return `${url.pathname}${url.search}${url.hash}`;
}

export function clearReportEntryLocation(url: URL) {
  url.searchParams.delete('report_lat');
  url.searchParams.delete('report_lng');
}
