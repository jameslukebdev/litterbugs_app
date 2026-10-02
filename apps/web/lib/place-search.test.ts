import { afterEach, expect, it, vi } from 'vitest';
import { searchPlaces, townSearchParts } from './place-search';
afterEach(() => vi.unstubAllGlobals());
it.each(['Huntington, West Virginia', 'Huntington West Virginia', 'Huntington, WV', 'Huntington WV', 'Huntington, wv, USA'])('honors the region in %s', text => {
  expect(townSearchParts(text)).toEqual({ name: 'Huntington', stateId: '54' });
});
it.each(['London, United Kingdom', 'Huntington, Invalid State', '123 Main Street, Huntington', 'Huntington, WV, Canada'])('never broadens an unsupported location: %s', text => {
  expect(townSearchParts(text)).toBeNull();
});
it('keeps full-state lookup aligned with FIPS, including leading zeros and multiword states', () => {
  expect(townSearchParts('Mobile, Alabama')?.stateId).toBe('01');
  expect(townSearchParts('Raleigh North Carolina')?.stateId).toBe('37');
  expect(townSearchParts('San Juan, Puerto Rico')?.stateId).toBe('72');
});
it('restricts both town sources to the requested state and escapes apostrophes', async () => {
  const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ features: [] }) }));
  vi.stubGlobal('fetch', fetcher);
  await searchPlaces("O'Fallon, Illinois");
  expect(fetcher).toHaveBeenCalledTimes(2);
  for (const call of fetcher.mock.calls as unknown as [string][]) expect(new URL(call[0]).searchParams.get('where')).toBe("UPPER(BASENAME) LIKE 'O''FALLON%' AND STATE = '17'");
});
