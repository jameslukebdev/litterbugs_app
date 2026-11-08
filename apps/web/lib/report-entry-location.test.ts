import { expect, it } from 'vitest';
import { clearReportEntryLocation, readReportEntryLocation, reportEntryLocationHref } from './report-entry-location';
import { googleBrowserHandoff } from './google-browser-handoff';

it('carries the exact selected pin and community through the account return path', () => {
  const href = reportEntryLocationHref(new URL('https://litterbugs.app/map?community=us-nc-boone&view=reports&report=old&intent=clean#map=36,-81,13'), { latitude: 36.123456789, longitude: -81.987654321 });
  const url = new URL(href, 'https://litterbugs.app');
  expect(url.pathname).toBe('/report');
  expect(url.searchParams.get('community')).toBe('us-nc-boone');
  expect(url.searchParams.get('view')).toBe('map');
  expect(url.searchParams.has('report')).toBe(false);
  expect(url.searchParams.has('intent')).toBe(false);
  expect(readReportEntryLocation(url.searchParams)).toEqual({ latitude: 36.123456789, longitude: -81.987654321 });
  clearReportEntryLocation(url);
  expect(readReportEntryLocation(url.searchParams)).toBeNull();
  expect(url.searchParams.get('community')).toBe('us-nc-boone');
});
it.each(['lat=36&lng=-81', 'report_lat=&report_lng=0', 'report_lat=91&report_lng=0', 'report_lat=0&report_lng=-181', 'report_lat=NaN&report_lng=0', 'report_lat=Infinity&report_lng=0', 'report_lat=36&report_lat=37&report_lng=-81', 'report_lat=36'])('does not treat invalid input or a viewport as a confirmed pin: %s', input => {
  expect(readReportEntryLocation(new URLSearchParams(input))).toBeNull();
});
it('accepts coordinates at zero', () => {
  expect(readReportEntryLocation(new URLSearchParams('report_lat=0&report_lng=0'))).toEqual({ latitude: 0, longitude: 0 });
});
it('keeps the selected pin when Instagram opens Google sign-in in Android Chrome', () => {
  const next = reportEntryLocationHref(new URL('https://litterbugs.app/map'), { latitude: 36.123, longitude: -81.987 });
  const handoff = googleBrowserHandoff('https://litterbugs.app', next, 'Instagram Android')!;
  const entry = new URL(handoff.split('#Intent')[0].replace('intent:', 'https:'));
  expect(entry.searchParams.get('next')).toBe(next);
  expect(readReportEntryLocation(new URL(entry.searchParams.get('next')!, 'https://litterbugs.app').searchParams)).toEqual({ latitude: 36.123, longitude: -81.987 });
});
