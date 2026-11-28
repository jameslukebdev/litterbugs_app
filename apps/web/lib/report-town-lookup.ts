import 'server-only';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { unstable_cache } from 'next/cache';

/**
 * Town names for reports outside an editorial community, from OpenStreetMap's
 * Nominatim reverse geocoder.
 *
 * - Only a rounded position (2 decimals, about 1 km) ever leaves the server, so
 *   the exact spot is never sent and nearby reports share one lookup.
 * - Answers are kept in the server Data Cache for 90 days. Failures are not
 *   cached, so a temporary outage does not blank a town for months.
 * - Nominatim allows one request a second: lookups run through a single queue.
 * - Callers say how long they will wait. A cached answer returns at once; a
 *   new lookup that takes longer than that returns null now and fills the cache
 *   for the next request.
 */
export type ReportTown = { locality: string; region: string; country: string; countryCode: string };

const REVALIDATE_SECONDS = 90 * 24 * 60 * 60;
const SPACING_MS = 1100;
const pending = new Map<string, Promise<ReportTown | null>>();
const MAX_QUEUE_WAIT_MS = 8 * SPACING_MS;
let nextLookupAt = 0;

function keepLookupRunning(lookup: Promise<ReportTown | ReportAddress | null>) {
  if (process.env.LITTERBUGS_IMAGE_RUNTIME !== 'cloudflare') return;
  // The page may stop waiting before the lookup completes. Its request must
  // remain alive until the cached value and any other waiting requests settle.
  getCloudflareContext().ctx.waitUntil(lookup);
}

/** Pick the town-level name from a Nominatim address, or null when it has none. */
export function townFromAddress(address: Record<string, string | undefined> | null | undefined): ReportTown | null {
  const locality = address?.city ?? address?.town ?? address?.village ?? address?.municipality ?? address?.hamlet;
  const region = address?.state ?? address?.province ?? address?.region;
  const countryCode = address?.country_code?.toUpperCase();
  if (!locality?.trim() || !region?.trim() || !address?.country?.trim() || !countryCode) return null;
  return { locality: locality.trim(), region: region.trim(), country: address.country.trim(), countryCode };
}

/** Nearest street address to a report, for people going to find the spot. */
export type ReportAddress = {
  /** "1242 E Center St", or just the road when there is no house number. */
  street: string;
  locality: string | null;
  /** Two-letter state or province code when OpenStreetMap gives one, else its full name. */
  region: string | null;
  postalCode: string | null;
  countryCode: string | null;
  /** "1242 E Center St, Kingsport, TN 37660" */
  line: string;
};

/** Build a postal-style line from a Nominatim address, or null when it names no road. */
export function streetAddressFrom(address: Record<string, string | undefined> | null | undefined): ReportAddress | null {
  // A road carrying several routes is named "NC 105;US 221 Truck;US 321 Truck": keep the first.
  const road = (address?.road ?? address?.pedestrian ?? address?.footway ?? address?.path ?? address?.cycleway)?.split(';')[0];
  if (!road?.trim()) return null;
  const street = [address?.house_number?.trim(), road.trim()].filter(Boolean).join(' ');
  const locality = (address?.city ?? address?.town ?? address?.village ?? address?.municipality ?? address?.hamlet)?.trim() || null;
  const code = address?.['ISO3166-2-lvl4']?.split('-')[1];
  const region = code || address?.state?.trim() || null;
  const postalCode = address?.postcode?.trim() || null;
  const tail = [region, postalCode].filter(Boolean).join(' ');
  return { street, locality, region, postalCode, countryCode: address?.country_code?.toUpperCase() ?? null,
    line: [street, locality, tail].filter(Boolean).join(', ') };
}

type ReverseResult = { address?: Record<string, string | undefined>; category?: string; type?: string; lat?: string; lon?: string };

/** Space OpenStreetMap requests without waiting on a timer owned by another request. */
async function nominatim<T>(endpoint: 'reverse' | 'search', params: Record<string, string>): Promise<T> {
  const now = Date.now();
  const startAt = Math.max(now, nextLookupAt);
  const wait = startAt - now;
  if (wait > MAX_QUEUE_WAIT_MS) throw new Error('Place lookup queue is busy.');
  nextLookupAt = startAt + SPACING_MS;
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
  const url = new URL(`https://nominatim.openstreetmap.org/${endpoint}`);
  url.search = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', 'accept-language': 'en', ...params }).toString();
  const response = await fetch(url, {
    headers: { 'User-Agent': 'litterbugs.app report pages (place names)', Accept: 'application/json' },
    cache: 'no-store', signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Place lookup failed: ${response.status}`);
  return await response.json() as T;
}

const reverse = (latitude: string, longitude: string, zoom: number) =>
  nominatim<ReverseResult>('reverse', { lat: latitude, lon: longitude, zoom: String(zoom) });

/** A place someone typed, as OpenStreetMap understands it. */
export type PlaceMatch = {
  name: string;
  type: string | null;
  population: number | null;
  address: Record<string, string | undefined>;
};

const MAX_WAITING_SEARCHES = 8;
let waitingSearches = 0;

/**
 * Look up a typed place name ("Banner Elk") once, when someone asks, never while they type: OpenStreetMap
 * does not allow search-as-you-type. Answers are cached for 30 days; failures are not cached. When too many
 * searches are already waiting, this says so instead of queueing more.
 */
export async function searchPlace(query: string): Promise<PlaceMatch | null | 'busy'> {
  const key = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (key.length < 2 || key.length > 80) return null;
  if (waitingSearches >= MAX_WAITING_SEARCHES) return 'busy';
  waitingSearches += 1;
  try {
    return await unstable_cache(async () => {
      const [first] = await nominatim<Array<ReverseResult & { name?: string; addresstype?: string; extratags?: Record<string, string> }>>(
        'search', { q: key, limit: '1', extratags: '1' });
      if (!first?.address) return null;
      const population = Number((first.extratags?.population ?? '').replace(/[^0-9]/g, ''));
      return { name: first.name ?? '', type: first.addresstype ?? null, population: population > 0 ? population : null, address: first.address };
    }, ['place-search-v1', key], { revalidate: 30 * 24 * 60 * 60 })();
  } finally {
    waitingSearches -= 1;
  }
}

const fetchTown = async (latitude: string, longitude: string) => townFromAddress((await reverse(latitude, longitude, 10)).address);

/** A house number is only worth showing when it belongs to a building right at the pin. */
const NEARBY_METRES = 75;

function metresBetween(latitude: number, longitude: number, other: ReverseResult) {
  const lat = Number(other.lat), lng = Number(other.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return Infinity;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const x = radians(lng - longitude) * Math.cos(radians((lat + latitude) / 2));
  return 6_371_000 * Math.hypot(x, radians(lat - latitude));
}

/**
 * OpenStreetMap answers a street-level lookup with whatever feature contains the
 * point. Inside a campus, park or shopping centre that is the whole site, whose
 * official address can be hundreds of metres away on a different road. So a
 * numbered address is kept only for a building or address point next to the pin;
 * anything else falls back to the nearest road, with no house number.
 */
export function isNearbyAddress(result: ReverseResult, latitude: number, longitude: number) {
  return Boolean(result.address?.house_number)
    && (result.category === 'building' || result.category === 'place')
    && metresBetween(latitude, longitude, result) <= NEARBY_METRES;
}

async function fetchAddress(lat: string, lng: string): Promise<ReportAddress | null> {
  const exact = await reverse(lat, lng, 18);
  if (isNearbyAddress(exact, Number(lat), Number(lng))) return streetAddressFrom(exact.address);
  // Nearest road instead. Drop any house number so the line never points at a specific property.
  const road = exact.category === 'highway' ? exact : await reverse(lat, lng, 17);
  return streetAddressFrom(road.address ? { ...road.address, house_number: undefined } : null);
}

const pendingAddresses = new Map<string, Promise<ReportAddress | null>>();

/**
 * The nearest street address to a report, or null when unknown, not answered
 * within `waitMs`, or the lookup failed. Unlike the town lookup this sends the
 * report's position to about 10 m, because a street address needs it; the
 * owner chose to show addresses so people can find the spot.
 */
export async function lookupReportAddress(latitude: number | null, longitude: number | null, waitMs: number): Promise<ReportAddress | null> {
  if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const lat = latitude.toFixed(4);
  const lng = longitude.toFixed(4);
  const key = `${lat},${lng}`;
  let lookup = pendingAddresses.get(key);
  if (!lookup) {
    lookup = unstable_cache(() => fetchAddress(lat, lng), ['report-address-v3', key], { revalidate: REVALIDATE_SECONDS })()
      .catch(() => null)
      .finally(() => { pendingAddresses.delete(key); });
    pendingAddresses.set(key, lookup);
    keepLookupRunning(lookup);
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), waitMs); });
  try {
    return await Promise.race([lookup, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** The town for a point, or null when unknown, not yet looked up within `waitMs`, or the lookup failed. */
export async function lookupReportTown(latitude: number | null, longitude: number | null, waitMs: number): Promise<ReportTown | null> {
  if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const lat = latitude.toFixed(2);
  const lng = longitude.toFixed(2);
  const key = `${lat},${lng}`;
  let lookup = pending.get(key);
  if (!lookup) {
    lookup = unstable_cache(() => fetchTown(lat, lng), ['report-town-v1', key], { revalidate: REVALIDATE_SECONDS })()
      .catch(() => null)
      .finally(() => { pending.delete(key); });
    pending.set(key, lookup);
    keepLookupRunning(lookup);
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), waitMs); });
  try {
    return await Promise.race([lookup, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
