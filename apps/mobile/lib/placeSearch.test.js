import { afterEach, expect, it, vi } from 'vitest';
import { searchPlaces, resolvePlace } from './placeSearch';
afterEach(() => vi.unstubAllGlobals());
it('qualifies same-named cities by state and escapes user text', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [] }) });
  vi.stubGlobal('fetch', fetcher);
  await searchPlaces("O'Fallon, MO");
  const url = new URL(fetcher.mock.calls[0][0]);
  expect(url.searchParams.get('where')).toBe("UPPER(BASENAME) LIKE 'O''FALLON%' AND STATE = '29'");
});
it('rejects service errors instead of presenting an empty boundary as success', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ error: { message: 'Unavailable' } }) }));
  await expect(resolvePlace({ id: 'test', layer: 4, geoid: '3707080' })).rejects.toThrow();
});
it('returns exact city names before prefix matches with separate boundary labels', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async url => ({ ok: true, json: async () => ({ features: url.includes('/4/') ? [{ attributes: { GEOID: 'a', BASENAME: 'Booneville', STATE: '37' } }, { attributes: { GEOID: 'b', BASENAME: 'Boone', STATE: '37' } }] : [] }) })));
  const results = await searchPlaces('Boone NC');
  expect(results[0].label).toBe('Boone, NC');
  expect(results[0].subtitle).toBe('Town and surrounding area');
});

it('uses a broader postal area for town discovery and keeps drawing/filtering geometry identical', async () => {
  const town = { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] };
  const area = { type: 'Polygon', coordinates: [[[-2,-2],[3,-2],[3,3],[-2,3],[-2,-2]]] };
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async url => ({ ok: true, json: async () => ({ features: [{ geometry: url.includes('ZCTA') ? area : town, properties: { GEOID: '28607' } }] }) })));
  const result = await resolvePlace({ id: 'broader', layer: 4, geoid: '3707080' });
  expect(result.geometry).toEqual(area);
  expect(result.postalCode).toBe('28607');
});
