import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const mapScreenSource = readFileSync(
  new URL('../MapScreen.js', import.meta.url),
  'utf8'
);
const reportsSource = readFileSync(
  new URL('./reports.js', import.meta.url),
  'utf8'
);
const reportListSource = readFileSync(
  new URL('../ReportList.js', import.meta.url),
  'utf8'
);

describe('report photo responsiveness', () => {
  it('uses the shared signed URL cache when report details open', () => {
    expect(mapScreenSource).toContain('getReportPhotoUrl(firstPhotoPath)');
    expect(mapScreenSource).not.toContain('const getSignedPhotoUrl = async');
    expect(reportsSource).toContain('const photoUrlCache = useRef(new Map())');
    expect(reportsSource).toContain('const photoUrlRequests = useRef(new Map())');
  });

  it('reveals the first photo before waiting for the remaining photos', () => {
    const firstPhotoReady = mapScreenSource.indexOf('setReportPhotoUrls([firstUrl])');
    const remainingPhotosStart = mapScreenSource.indexOf(
      'const remainingUrls = await Promise.all('
    );

    expect(firstPhotoReady).toBeGreaterThanOrEqual(0);
    expect(remainingPhotosStart).toBeGreaterThan(firstPhotoReady);
  });

  it('uses a stable disk-cache key for signed report images', () => {
    expect(mapScreenSource).toContain(
      'cacheKey: selectedReport.photo_paths?.[index] ?? uri'
    );
    expect(reportListSource).toContain(
      'source={{ uri: photoUrl, cacheKey: photoPath }}'
    );
  });
});
