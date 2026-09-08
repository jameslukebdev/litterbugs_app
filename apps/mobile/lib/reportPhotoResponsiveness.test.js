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
  it('offers both camera and photo-library actions for report evidence', () => {
    expect(mapScreenSource).toContain('ImagePicker.launchCameraAsync(reportCameraPickerOptions({');
    expect(mapScreenSource).toContain('nativePhotoOptimizationAvailable: isPhotoOptimizationAvailable()');
    expect(mapScreenSource).toContain("onPress={() => pickImage('camera')}");
    expect(mapScreenSource).toContain("onPress={() => pickImage('library')}");
    expect(mapScreenSource).toContain('>Take photo</Text>');
    expect(mapScreenSource).toContain('>Choose photos</Text>');
    expect(mapScreenSource).toContain('Add 1–3 photos of the littered area.');
    expect(mapScreenSource).toContain(
      'or surroundings that will help a cleaner find the location.'
    );
  });

  it('safety-checks report photos with bounded concurrency and visible progress', () => {
    expect(mapScreenSource).toContain('REPORT_PHOTO_UPLOAD_CONCURRENCY');
    expect(mapScreenSource).toContain('mapInConcurrentBatches(');
    expect(mapScreenSource).toContain('Photo ${completedPhotos} of ${photoUris.length} safety-checked.');
  });

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
    const gallery = readFileSync(new URL('../components/ReportPhotoGallery.js', import.meta.url), 'utf8');
    expect(gallery).toContain('cacheKey: path || uri');
    expect(reportListSource).toContain(
      'source={{ uri: photoUrl, cacheKey: photoPath }}'
    );
  });
});
