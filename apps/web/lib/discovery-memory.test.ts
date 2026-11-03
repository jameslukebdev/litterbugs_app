import { expect, it } from 'vitest';

import { browserUrl, readBrowserUrl, mapUrl, readMapUrl, readDiscoveryView } from './discovery-memory';
it('restores filters from shareable URLs and preserves report selection', () => {
  const value = readBrowserUrl('?browse=1&status=progress&radius=25&q=bottles&sort=reward-high')!;
  expect(value.filters).toMatchObject({ status: 'progress', radius: 25, query: 'bottles' });
  const result = browserUrl(new URL('https://litterbugs.app/?report=example'), value);
  expect(result).toContain('report=example');
  expect(readBrowserUrl(result.slice(result.indexOf('?')))).toEqual(value);
  expect(readBrowserUrl('?browse=1&status=invalid&radius=999')?.filters).toMatchObject({ status: 'all', radius: 0 });
  expect(readBrowserUrl('?report=example')).toBeNull();
});

it('restores the map area without serializing precise device coordinates', () => {
  const url = mapUrl(new URL('https://litterbugs.app/?area=4:12345&browse=1'), { latitude: 36.123456789, longitude: -81.7654321, zoom: 13 });
  expect(url).toContain('lat=36.123'); expect(url).toContain('area=4%3A12345');
  expect(readMapUrl(url.slice(url.indexOf('?')))).toEqual({ latitude: 36.123, longitude: -81.765, zoom: 13 });
  expect(readMapUrl('?lat=999&lng=0&zoom=12')).toBeNull();
  expect(readMapUrl('?lat=0&lng=0&zoom=NaN')).toBeNull();
});

it('opens Map on mobile and honors explicit Map and Reports links on both layouts', () => {
  expect(readDiscoveryView('', true)).toBe('map');
  expect(readDiscoveryView('', false)).toBe('reports');
  expect(readDiscoveryView('?view=reports', true)).toBe('reports');
  expect(readDiscoveryView('?view=map', false)).toBe('map');
  expect(readDiscoveryView('?view=invalid', true)).toBe('map');
});
