import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createLocationSearch, locationType } from './location-suggestions';
const api = vi.hoisted(() => ({ autocomplete: vi.fn(), geocode: vi.fn(), detail: vi.fn() }));
vi.mock('@googlemaps/js-api-loader', () => ({ setOptions: vi.fn(), importLibrary: async (name: string) => name === 'places'
  ? { AutocompleteSessionToken: class {}, AutocompleteSuggestion: { fetchAutocompleteSuggestions: api.autocomplete } }
  : { Geocoder: class { geocode = api.geocode; } } }));
const location = { lat: () => 40.7, lng: () => -74 };
const viewport = { toJSON: () => ({ north: 41, south: 40, west: -75, east: -73 }) };
const prediction = (id: string, label: string, types = ['locality']) => ({ placePrediction: {
  placeId: id, text: { toString: () => label }, types,
  toPlace: () => ({ location, viewport, fetchFields: api.detail }),
} });
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal('google', { maps: { importLibrary: vi.fn() } }); api.detail.mockResolvedValue({}); });
afterEach(() => vi.unstubAllGlobals());
it('keeps provider ranking, removes repeated identities, and labels a city correctly', async () => {
  api.autocomplete.mockResolvedValue({ suggestions: [prediction('nyc', 'New York, NY, USA'), prediction('nyc', 'New York'), prediction('mills', 'New York Mills, MN, USA')] });
  const search = createLocationSearch();
  const suggestions = await search.search('New York', { latitude: 36, longitude: -81 });
  expect(suggestions.map(x => x.id)).toEqual(['nyc', 'mills']);
  expect(suggestions[0].subtitle).toBe('City / town');
  expect(api.detail).not.toHaveBeenCalled();
  expect(api.autocomplete.mock.calls[0][0].locationBias.center).toEqual({ lat: 36, lng: -81 });
  expect(api.autocomplete.mock.calls[0][0].locationRestriction).toBeUndefined();
});
it('reuses one token while typing and starts a new session after choosing a place', async () => {
  api.autocomplete.mockResolvedValue({ suggestions: [prediction('nyc', 'New York, NY, USA')] });
  const search = createLocationSearch();
  await search.search('New');
  const suggestions = await search.search('New York');
  expect(api.autocomplete.mock.calls[0][0].sessionToken).toBe(api.autocomplete.mock.calls[1][0].sessionToken);
  const result = await suggestions[0].resolve();
  expect(result.geometry).toBeUndefined();
  expect(result.bounds).toEqual(viewport.toJSON());
  expect(api.detail).toHaveBeenCalledWith({ fields: ['location', 'viewport'] });
  await search.search('London');
  expect(api.autocomplete.mock.calls[2][0].sessionToken).not.toBe(api.autocomplete.mock.calls[1][0].sessionToken);
});
it('falls back to one Google list when Places is unavailable without adding Census duplicates', async () => {
  api.autocomplete.mockRejectedValue(new Error('API unavailable'));
  api.geocode.mockResolvedValue({ results: [{ place_id: 'nyc', formatted_address: 'New York, NY, USA', types: ['locality'], geometry: { location, viewport } }] });
  const search = createLocationSearch();
  expect((await search.search('New York')).map(x => x.label)).toEqual(['New York, NY, USA']);
  await search.search('London');
  expect(api.autocomplete).toHaveBeenCalledTimes(1);
  expect(api.geocode).toHaveBeenCalledTimes(2);
});
it('distinguishes empty suggestions from a provider failure', async () => {
  api.autocomplete.mockResolvedValue({ suggestions: [] });
  expect(await createLocationSearch().search('unknown')).toEqual([]);
  api.autocomplete.mockRejectedValue(new Error('Offline'));
  api.geocode.mockRejectedValue(new Error('Offline'));
  await expect(createLocationSearch().search('London')).rejects.toThrow('Offline');
});
it('uses meaningful location types instead of labelling every result an address', () => {
  expect(locationType(['postal_code'])).toBe('Postal code');
  expect(locationType(['street_address'])).toBe('Address');
  expect(locationType(['administrative_area_level_1'])).toBe('Region');
});
