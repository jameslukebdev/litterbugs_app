import { describe, expect, it, vi } from 'vitest';
import { resolveReportPhotoUrls } from './reportPhotoUrls';

describe('gallery URL coordination', () => {
  it('starts photos together and keeps their original order when they finish out of order', async () => {
    const pending = {};
    const getUrl = vi.fn(path => new Promise(resolve => { pending[path] = resolve; }));
    const firstReady = vi.fn();
    const result = resolveReportPhotoUrls(['a', 'b', 'c'], getUrl, firstReady);
    expect(getUrl.mock.calls.map(call => call[0])).toEqual(['a', 'b', 'c']);
    pending.c('url-c'); pending.a('url-a');
    await Promise.resolve();
    expect(firstReady).toHaveBeenCalledWith('url-a');
    pending.b('url-b');
    expect(await result).toEqual(['url-a', 'url-b', 'url-c']);
  });
  it('keeps failed photo slots without discarding successful neighbours', async () => {
    const result = await resolveReportPhotoUrls(['a', 'b', 'c'], async path => {
      if (path === 'a') throw new Error('offline');
      return path === 'b' ? null : 'url-c';
    });
    expect(result).toEqual([null, null, 'url-c']);
  });
});

describe('report card photo addresses', async () => {
  const { reportCardPhotoUrl, reportAfterPhotoUrl } = await import('./reportPhotoUrls');
  it('uses the website card copy for stored report photos', () => {
    expect(reportCardPhotoUrl('u/r/a b.JPG')).toBe('https://litterbugs.app/api/report-photo?path=u%2Fr%2Fa%20b.JPG&variant=card');
    expect(reportCardPhotoUrl('u/r/a.heic')).toContain('variant=card');
  });
  it('leaves full addresses and unsupported files to the original photo', () => {
    expect(reportCardPhotoUrl('https://example.test/a.jpg')).toBeNull();
    expect(reportCardPhotoUrl('u/r/a.gif')).toBeNull();
    expect(reportCardPhotoUrl(null)).toBeNull();
  });
  it('builds the cleaned-report after photo address', () => {
    expect(reportAfterPhotoUrl('abc')).toBe('https://litterbugs.app/reports/abc/photo/after?width=640');
    expect(reportAfterPhotoUrl(null)).toBeNull();
  });
});
