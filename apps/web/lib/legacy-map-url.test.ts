import { describe, expect, it } from 'vitest';
import { legacyMapDestination } from './legacy-map-url';
describe('homepage and legacy map separation', () => {
  it('keeps ordinary visits and campaign parameters on the homepage', () => {
    expect(legacyMapDestination({})).toBeNull();
    expect(
      legacyMapDestination({
        utm_source: 'newsletter',
        utm_campaign: 'report',
        q: 'litter',
      }),
    ).toBeNull();
  });
  it('preserves report selection, return path, repeated parameters and attribution', () => {
    const url = new URL(
      legacyMapDestination({
        report: 'report-id',
        returnTo: '/account/reports',
        utm_source: 'share',
        tag: ['a', 'b'],
      })!,
      'https://litterbugs.app',
    );
    expect(url.pathname).toBe('/map');
    expect(url.searchParams.get('report')).toBe('report-id');
    expect(url.searchParams.get('returnTo')).toBe('/account/reports');
    expect(url.searchParams.getAll('tag')).toEqual(['a', 'b']);
    expect(url.searchParams.get('utm_source')).toBe('share');
  });
  it.each([
    { view: 'map' },
    { view: 'reports' },
    { compose: 'resume' },
    { area: '4:3707080' },
    { browse: '1', status: 'completed' },
    { lat: '36', lng: '-81', zoom: '12' },
  ])('migrates recognized application state %j', (params) => {
    expect(legacyMapDestination(params)).toMatch(/^\/map\?/);
  });
  it('does not interpret arbitrary view labels or partial coordinates as map intent', () => {
    expect(legacyMapDestination({ view: 'campaign', lat: '36' })).toBeNull();
  });
});
