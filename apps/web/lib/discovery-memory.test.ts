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
  expect(url).toContain('#map=36.123,-81.765,13.0'); expect(new URL(url, 'https://litterbugs.app').searchParams.get('area')).toBe('4:12345');
  expect(readMapUrl(new URL(url, 'https://litterbugs.app').search, new URL(url, 'https://litterbugs.app').hash)).toEqual({ latitude: 36.123, longitude: -81.765, zoom: 13 });
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

it('keeps query page identity stable while moving and accepts legacy shared viewports', () => {
  const legacy = new URL('https://litterbugs.app/map?report=spot&lat=1&lng=2&zoom=12');
  expect(readMapUrl(legacy.search)).toEqual({latitude:1,longitude:2,zoom:12});
  const moved = new URL(mapUrl(legacy, {latitude:3,longitude:4,zoom:15}), legacy);
  expect(moved.search).toBe(legacy.search);
  expect(readMapUrl(moved.search, moved.hash)).toEqual({latitude:3,longitude:4,zoom:15});
  expect(new URL(mapUrl(moved, {latitude:5,longitude:6,zoom:16}), legacy).search).toBe(legacy.search);
});
