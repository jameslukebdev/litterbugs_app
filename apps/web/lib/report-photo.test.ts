import { describe, expect, it } from 'vitest';

import {
  getReportCardPhotoUrl,
  getReportDetailPhotoUrl,
  getWebCompatibleReportPhotoUrl,
  isHeicReportPhoto,
  isReportCardPhoto,
} from './report-photo';

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

  it('routes supported card photos through the cached thumbnail endpoint', () => {
    expect(isReportCardPhoto('user/report/photo.jpg')).toBe(true);
    expect(isReportCardPhoto('user/report/photo.heic')).toBe(true);
    expect(getReportCardPhotoUrl('user/report/photo.jpg')).toBe(
      '/api/report-photo?path=user%2Freport%2Fphoto.jpg&variant=card',
    );
    expect(getReportCardPhotoUrl('user/report/photo.pdf')).toBeNull();
  });

  it('routes supported detail photos through the optimized detail endpoint', () => {
    expect(getReportDetailPhotoUrl('user/report/photo.jpg')).toBe(
      '/api/report-photo?path=user%2Freport%2Fphoto.jpg&variant=detail',
    );
    expect(getReportDetailPhotoUrl('user/report/photo.heic')).toBe(
      '/api/report-photo?path=user%2Freport%2Fphoto.heic&variant=detail',
    );
    expect(getReportDetailPhotoUrl('user/report/photo.pdf')).toBeNull();
  });

  it('scopes administrator HEIC conversion to the authenticated case', () => {
    expect(getWebCompatibleReportPhotoUrl('user/report/photo.heic', {
      adminCaseId: '11111111-1111-4111-8111-111111111111',
    })).toBe(
      '/api/report-photo?path=user%2Freport%2Fphoto.heic&caseId=11111111-1111-4111-8111-111111111111',
    );
  });
});
