import { describe, expect, it } from 'vitest';
import { reportSite, alreadyReportedId } from './report-site-model';
import type { PublicReportShareModel } from './public-report-share-model';

const report = (id: string, state: PublicReportShareModel['state'], reporterName: string, date: string) => ({ id, state, reporterName, reportDate: date } as PublicReportShareModel);
describe('site occurrences', () => {
  it('keeps historical authors and completed counts while choosing the current report', () => {
    const old = report('old', 'completed', 'Riley', '2026-11-15');
    const next = report('new', 'available', 'Jamie', '2026-11-24');
    const site = reportSite([next, old]);
    expect(site.reports.map(item => item.reporterName)).toEqual(['Riley', 'Jamie']);
    expect(site.currentReportId).toBe('new');
    expect(site.completedCount).toBe(1);
    expect(site.canReportAgain).toBe(false);
    expect(old.reporterName).toBe('Riley');
  });
  it('permits a new report only when a completed cleanup exists and no current report remains', () => {
    expect(reportSite([report('old', 'completed', 'Riley', '2026-11-15')]).canReportAgain).toBe(true);
    expect(reportSite([report('expired', 'expired', 'Riley', '2026-11-15')]).canReportAgain).toBe(false);
    expect(reportSite([report('old', 'completed', 'Riley', '2026-11-15'), report('claim', 'in_progress', 'Jamie', '2026-11-24')]).canReportAgain).toBe(false);
  });
  it('accepts only an explicit server duplicate and a valid report ID', () => {
    const id = '10000000-0000-4000-8000-000000000003';
    expect(alreadyReportedId({ message: 'site_already_reported', details: id })).toBe(id);
    expect(alreadyReportedId({ message: 'other error', details: id })).toBeNull();
    expect(alreadyReportedId({ message: 'site_already_reported', details: 'private content' })).toBeNull();
  });
});
