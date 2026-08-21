import { describe, expect, it } from 'vitest';

import { getWebCompatibleReportPhotoUrl, isHeicReportPhoto } from './report-photo';

describe('report photo delivery', () => {
  it('routes HEIC and HEIF objects through the web compatibility endpoint', () => {
    expect(isHeicReportPhoto('user/report/photo.heic')).toBe(true);
    expect(isHeicReportPhoto('user/report/PHOTO.HEIF')).toBe(true);
    expect(getWebCompatibleReportPhotoUrl('user/report/photo.heic')).toBe(
      '/api/report-photo?path=user%2Freport%2Fphoto.heic',
    );
  });

  it('keeps browser-compatible images on their existing signed URL path', () => {
    expect(isHeicReportPhoto('user/report/photo.jpeg')).toBe(false);
    expect(isHeicReportPhoto('user/report/photo.png')).toBe(false);
    expect(getWebCompatibleReportPhotoUrl('user/report/photo.webp')).toBeNull();
  });
});
