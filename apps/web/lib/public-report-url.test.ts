import { expect, it } from 'vitest';
import { isPublicReportPagePath, publicReportIdFromPath, publicReportIdFromSlug, publicReportPath, publicReportSlug } from './public-report-url';

const id = 'c9de971b-9b18-4e63-8b2d-00bba1de799c';

it('builds a readable address from the title and verified town, ending in the id', () => {
  expect(publicReportPath(id, 'Trash in and around cabin', 'Boone, North Carolina'))
    .toBe(`/litter-reports/trash-in-and-around-cabin-boone-north-carolina-${id}`);
  expect(publicReportSlug('Café’s  back lot!!', null)).toBe('cafes-back-lot');
  expect(publicReportSlug('垃圾', undefined)).toBe('litter-report');
  expect(publicReportSlug('a'.repeat(200))).toHaveLength(70);
});

it('reads the id from either address form and ignores the words before it', () => {
  expect(publicReportIdFromPath(`/reports/${id}`)).toBe(id);
  expect(publicReportIdFromPath(`/litter-reports/an-old-title-${id.toUpperCase()}`)).toBe(id);
  expect(publicReportIdFromPath(`/litter-reports/${id}`)).toBe(id);
  expect(publicReportIdFromSlug(`anything-${id}`)).toBe(id);
  expect(publicReportIdFromSlug('no-id-here')).toBeNull();
});

it('does not treat photos, listings or other pages as report pages', () => {
  for (const path of [`/reports/${id}/photo/before`, '/reports', '/reports/history', `/reports/${id}/opengraph-image/card`, '/cleanups']) {
    expect(publicReportIdFromPath(path)).toBeNull();
    expect(isPublicReportPagePath(path)).toBe(false);
  }
  expect(isPublicReportPagePath('/litter-reports/not-a-report')).toBe(true);
});
