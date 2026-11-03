import { expect, it } from 'vitest';
import { publicReportPhotoDescription, publicReportSearchTitle, publicReportSearchDescription, publicReportSummary, reportDateLabel } from './public-report-content';
import type { PublicReportShareModel } from './public-report-share-model';
const report: PublicReportShareModel = {
  id: 'report', title: 'Greenwood Lot', state: 'completed',
  generalLocation: 'Exact location shown only in Litterbugs',
  notes: null, litterTypes: [], severity: null, reportDate: '2026-10-28T23:30:00Z',
  cleanerName: null, completionDate: null, cleanupDescription: null,
  bagsOrItemsRemoved: null, weightPounds: null,
  beforePhotoUrl: '/before', afterPhotoUrl: '/after', canonicalUrl: 'https://litterbugs.app/reports/report',
};
it('never turns a title, missing geography, or exact-location placeholder into a claimed locality', () => {
  expect(publicReportSearchTitle(report)).toBe('Greenwood Lot — Completed cleanup');
  expect(publicReportSearchTitle({ ...report, localityLabel: 'Unverified place' })).not.toContain('Unverified');
  expect(publicReportPhotoDescription(report, 'before').caption).not.toContain('Exact location');
});
it('only promises paired evidence when both photo URLs exist', () => {
  expect(publicReportSearchDescription(report)).toContain('before-and-after');
  expect(publicReportSearchDescription({ ...report, afterPhotoUrl: null })).not.toContain('before-and-after');
});
it('distinguishes underway and open reports from completed results', () => {
  expect(publicReportSearchTitle({ ...report, state: 'in_progress' })).toContain('Cleanup in progress');
  expect(publicReportSummary({ ...report, state: 'available' })).toContain('needs a cleanup');
  expect(publicReportPhotoDescription({ ...report, state: 'available' }, 'before').label).toBe('Report photo');
});
it('labels reporting and completion dates rather than inventing photo capture dates', () => {
  expect(publicReportPhotoDescription(report, 'before').caption).toContain('Reported October 28, 2026');
  expect(publicReportPhotoDescription(report, 'after').caption).not.toContain('October 28');
  expect(reportDateLabel('invalid')).toBeNull();
});
