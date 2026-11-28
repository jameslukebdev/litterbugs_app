import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const { stored } = vi.hoisted(() => ({ stored: new Map<string, unknown>() }));
vi.mock('server-only', () => ({}));
// A stand-in Data Cache: keeps successful answers, never failures.
vi.mock('next/cache', () => ({
  unstable_cache: (generate: () => Promise<unknown>, parts: string[]) => async () => {
    const key = JSON.stringify(parts);
    if (!stored.has(key)) stored.set(key, await generate());
    return stored.get(key);
  },
}));

import { isNearbyAddress, lookupReportAddress, lookupReportTown, streetAddressFrom, townFromAddress } from './report-town-lookup';

const greensboro = { city: 'Greensboro', county: 'Guilford County', state: 'North Carolina', country: 'United States', country_code: 'us' };
const answer = (address: unknown, ok = true) => ({ ok, status: ok ? 200 : 503, json: async () => ({ address }) });
const fetchMock = vi.fn();
beforeEach(() => { stored.clear(); fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); });

it('reads a town, state and country, and refuses to name a place without them', () => {
  expect(townFromAddress(greensboro)).toEqual({ locality: 'Greensboro', region: 'North Carolina', country: 'United States', countryCode: 'US' });
  expect(townFromAddress({ village: 'Valle Crucis', state: 'North Carolina', country: 'United States', country_code: 'us' })?.locality).toBe('Valle Crucis');
  expect(townFromAddress({ county: 'Guilford County', state: 'North Carolina', country: 'United States', country_code: 'us' })).toBeNull();
  expect(townFromAddress({ city: 'Greensboro' })).toBeNull();
  expect(townFromAddress(undefined)).toBeNull();
});

it('sends only a rounded position, and looks a neighbourhood up once', async () => {
  fetchMock.mockResolvedValue(answer(greensboro));
  expect(await lookupReportTown(36.030412, -79.791377, 5000)).toMatchObject({ locality: 'Greensboro' });
  expect(await lookupReportTown(36.0349, -79.7949, 5000)).toMatchObject({ locality: 'Greensboro' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const url = new URL(String(fetchMock.mock.calls[0][0]));
  expect(url.origin + url.pathname).toBe('https://nominatim.openstreetmap.org/reverse');
  expect([url.searchParams.get('lat'), url.searchParams.get('lon')]).toEqual(['36.03', '-79.79']);
  expect(String(fetchMock.mock.calls[0][0])).not.toContain('030412');
}, 15000);

it('returns no town, and remembers nothing, when the lookup fails or the point is missing', async () => {
  fetchMock.mockResolvedValueOnce(answer(null, false)).mockResolvedValueOnce(answer(greensboro));
  expect(await lookupReportTown(10, 20, 5000)).toBeNull();
  expect(await lookupReportTown(10, 20, 5000)).toMatchObject({ locality: 'Greensboro' });
  expect(await lookupReportTown(null, 20, 5000)).toBeNull();
  expect(await lookupReportTown(Number.NaN, 20, 5000)).toBeNull();
}, 15000);

it('builds a postal-style street address, and none where no road is named', () => {
  const kingsport = { house_number: '1242', road: 'East Center Street', city: 'Kingsport', state: 'Tennessee', 'ISO3166-2-lvl4': 'US-TN', postcode: '37660', country_code: 'us' };
  expect(streetAddressFrom(kingsport)).toMatchObject({ street: '1242 East Center Street', line: '1242 East Center Street, Kingsport, TN 37660', postalCode: '37660', countryCode: 'US' });
  // Litter is often beside a road with no house number.
  expect(streetAddressFrom({ road: 'Roby Greene Road', town: 'Boone', state: 'North Carolina' })?.line).toBe('Roby Greene Road, Boone, North Carolina');
  expect(streetAddressFrom({ city: 'Kingsport', state: 'Tennessee' })).toBeNull();
  expect(streetAddressFrom(null)).toBeNull();
});

it('names the nearest road, not a campus address, when the pin is inside a large site', async () => {
  // Inside a university: the street-level answer is the whole campus, addressed on another road 200 m away.
  const campus = { category: 'amenity', type: 'university', lat: '36.2150', lon: '-81.6850',
    address: { house_number: '287', road: 'Rivers Street', town: 'Boone', state: 'North Carolina', 'ISO3166-2-lvl4': 'US-NC', postcode: '28608' } };
  const road = { category: 'highway', type: 'residential', lat: '36.2136', lon: '-81.6841',
    address: { road: 'Stadium Drive', town: 'Boone', state: 'North Carolina', 'ISO3166-2-lvl4': 'US-NC', postcode: '28608' } };
  fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => campus }).mockResolvedValueOnce({ ok: true, status: 200, json: async () => road });
  expect((await lookupReportAddress(36.2135, -81.6840, 8000))?.line).toBe('Stadium Drive, Boone, NC 28608');
  expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.get('zoom')).toBe('17');
  expect(isNearbyAddress(campus, 36.2135, -81.6840)).toBe(false);
  // A numbered building far from the pin is no better.
  expect(isNearbyAddress({ ...campus, category: 'building' }, 36.2135, -81.6840)).toBe(false);
}, 15000);

it('keeps a house number for a building beside the pin, and looks a spot up once', async () => {
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ category: 'building', lat: '36.0305', lon: '-79.7914',
    address: { house_number: '12', road: 'Main Street', city: 'Greensboro', state: 'North Carolina', postcode: '27401' } }) });
  expect((await lookupReportAddress(36.030412, -79.791377, 5000))?.line).toBe('12 Main Street, Greensboro, North Carolina 27401');
  expect((await lookupReportAddress(36.030412, -79.791377, 5000))?.street).toBe('12 Main Street');
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const url = new URL(String(fetchMock.mock.calls[0][0]));
  expect([url.searchParams.get('lat'), url.searchParams.get('lon'), url.searchParams.get('zoom')]).toEqual(['36.0304', '-79.7914', '18']);
  expect(await lookupReportAddress(null, null, 5000)).toBeNull();
}, 15000);

it('does not hold a page up for a slow lookup', async () => {
  fetchMock.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(answer(greensboro)), 3000)));
  const started = Date.now();
  expect(await lookupReportTown(1, 2, 50)).toBeNull();
  expect(Date.now() - started).toBeLessThan(1000);
});
