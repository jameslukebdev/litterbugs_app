import { expect, it } from 'vitest';
import { publicReportPageTitle, publicReportPhotoDescription, publicReportSearchTitle, publicReportSearchDescription, publicReportSummary, publicReportOriginalSummary, publicReportHistorySummary, reportDateLabel } from './public-report-content';
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
  expect(publicReportSearchTitle(report)).toBe('Greenwood Lot – cleaned up');
  expect(publicReportSearchTitle({ ...report, localityLabel: 'Unverified place' })).not.toContain('Unverified');
  expect(publicReportPhotoDescription(report, 'before').caption).not.toContain('Exact location');
});
it('only promises paired evidence when both photo URLs exist', () => {
  expect(publicReportSearchDescription(report)).toContain('before-and-after');
  expect(publicReportSearchDescription({ ...report, afterPhotoUrl: null })).not.toContain('before-and-after');
});
it('distinguishes underway and open reports from completed results', () => {
  expect(publicReportSearchTitle({ ...report, state: 'in_progress' })).toContain('cleanup underway');
  expect(publicReportSummary({ ...report, state: 'available' })).toContain('needs a cleanup');
  expect(publicReportPhotoDescription({ ...report, state: 'available' }, 'before').label).toBe('Report photo');
});
it('labels reporting and completion dates rather than inventing photo capture dates', () => {
  expect(publicReportPhotoDescription(report, 'before').caption).toContain('Reported October 28, 2026');
  expect(publicReportPhotoDescription(report, 'after').caption).not.toContain('October 28');
  expect(reportDateLabel('invalid')).toBeNull();
});

it('presents a photo-less expired report as factual history while keeping its outcome clear', () => {
  const archived = { ...report, state: 'expired' as const, title: 'Sand trash',
    notes: 'Scattered', litterTypes: ['Cans', 'Bottles'], severity: 'Medium',
    reportDate: '2026-09-16T01:24:37Z', expiredDate: '2026-10-16T01:24:37Z', beforePhotoUrl: null };
  expect(publicReportSearchTitle(archived)).toBe('Sand trash – past report');
  expect(publicReportSummary(archived)).toBe('Litter report recorded on September 16, 2026.');
  expect(publicReportOriginalSummary(archived)).toBe('The report identified Cans and Bottles. Recorded details: Scattered. The reported priority was medium.');
  expect(publicReportHistorySummary(archived)).toBe('The original report was submitted on September 16, 2026. Its active reporting period ended on October 16, 2026. A cleanup has not been confirmed.');
  expect(publicReportSearchDescription(archived)).toContain('cans and bottles');
  expect(publicReportSearchDescription(archived)).toContain('A cleanup has not been confirmed.');
  expect(publicReportSearchDescription(archived)).not.toMatch(/photo|Boone|cleaned up/i);
});

it('does not fill gaps in a historical record with invented evidence or dates', () => {
  const sparse = { ...report, state: 'expired' as const, reportDate: null, expiredDate: 'invalid' };
  expect(publicReportOriginalSummary(sparse)).toBe('');
  expect(publicReportHistorySummary(sparse)).toBe('Its active reporting period has ended. A cleanup has not been confirmed.');
});

it('keeps titles and descriptions short enough for search results (Ahrefs, Nov 2026)', () => {
  const long: PublicReportShareModel = { ...report, state: 'available', fundingEligible: true,
    title: 'Huge pile of construction debris, mattresses and household trash dumped behind the old mill',
    place: { locality: 'Greensboro', region: 'North Carolina', countryCode: 'US' }, localityLabel: 'Greensboro, North Carolina',
    address: { street: '400 South Elm Street' } as PublicReportShareModel['address'], reporterName: 'James Luke Barber',
    litterTypes: ['Bottles', 'Cans', 'Fast food bags', 'Food wrappers', 'Tires'], beforePhotoUrl: '/before', afterPhotoUrl: null, photoCount: 2 };
  const title = publicReportSearchTitle(long);
  expect(publicReportPageTitle(long).length).toBeLessThanOrEqual(65);
  // The report's name is shortened; the town and status always stay.
  expect(title).toMatch(/^Huge pile of .+…, Greensboro – needs cleanup$/);
  const description = publicReportSearchDescription(long);
  expect(description.length).toBeLessThanOrEqual(155);
  expect(description).toBe('This spot near Greensboro, North Carolina needs a cleanup. Fund it or clean it up on Litterbugs. Litter: bottles, cans, fast food bags and more.');
  // Search copy never names the reporter or the street.
  expect(description).not.toMatch(/James|Elm/);
  expect(publicReportSearchTitle({ ...long, title: 'Trash by the tracks' })).toBe('Trash by the tracks, Greensboro – needs cleanup');
  // The site name is added only when it fits without cutting the report's name.
  expect(publicReportPageTitle({ ...long, title: 'Trash by the tracks' })).toBe('Trash by the tracks, Greensboro – needs cleanup | Litterbugs');
  const woods = publicReportPageTitle({ ...long, title: 'Trash all over woods behind the gas station' });
  expect(woods).toBe('Trash all over woods behind the gas…, Greensboro – needs cleanup');
  expect(woods.length).toBeLessThanOrEqual(65);
});
