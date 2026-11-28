import { expect, it } from 'vitest';
import type { PublicReportShareModel } from '@/lib/public-report-share-model';
import { distanceLabel, reportFacts, reportTimeline } from './report-facts';

const report: PublicReportShareModel = {
  id: 'report', title: 'Creek cleanup', state: 'completed', generalLocation: 'Boone, North Carolina, United States',
  notes: null, litterTypes: ['Cans', 'Bottles'], severity: 'Medium', reporterName: 'Hayden', reportDate: '2026-11-05T12:00:00Z',
  cleanerName: 'Nevan', completionDate: '2026-11-08T15:00:00Z', claimedDate: '2026-11-07T09:00:00Z', fundedDate: '2026-11-06T10:00:00Z',
  cleanupDescription: null, bagsOrItemsRemoved: 2, weightPounds: 12,
  beforePhotoUrl: '/before', photoCount: 3, afterPhotoUrl: '/after', afterPhotoCount: 2, canonicalUrl: 'https://litterbugs.app/x',
};
const pairs = (value: PublicReportShareModel, now?: number) => reportFacts(value, now).map(fact => `${fact.value} ${fact.label}`);

it('summarises a completed cleanup in numbers', () => {
  expect(pairs(report)).toEqual(['12 lb removed', '2 bags/items', '3 days report to cleanup']);
  // Time on site, when the cleaner recorded it.
  expect(pairs({ ...report, cleanupMinutes: 150 })).toContain('2.5 hrs cleanup time');
  expect(pairs({ ...report, cleanupMinutes: 60 })).toContain('1 hr cleanup time');
  expect(pairs({ ...report, cleanupMinutes: 45 })).toContain('45 min cleanup time');
});

it('counts how long an open report has waited, and how long an expired one was open', () => {
  const now = Date.parse('2026-11-11T12:00:00Z');
  expect(pairs({ ...report, state: 'available', afterPhotoUrl: null }, now)).toEqual(['6 days open', '2 litter types', '3 photos']);
  expect(pairs({ ...report, state: 'expired', expiredDate: '2026-12-05T12:00:00Z', afterPhotoUrl: null }, now)).toContain('30 days open');
});

it('leaves out any number that was not recorded', () => {
  expect(pairs({ ...report, weightPounds: null, bagsOrItemsRemoved: 0, completionDate: null, litterTypes: [], beforePhotoUrl: null, afterPhotoUrl: null })).toEqual([]);
  // A completion dated before the report is a data error, not a negative wait.
  expect(pairs({ ...report, completionDate: '2026-11-01T00:00:00Z' })).not.toContain('report to cleanup');
});

it('orders the dated steps and names who did them', () => {
  expect(reportTimeline(report).map(step => `${step.date}: ${step.label}`)).toEqual([
    'November 5, 2026: Reported by Hayden',
    'November 6, 2026: First donation received',
    'November 7, 2026: Cleanup claimed',
    'November 8, 2026: Cleaned up by Nevan',
  ]);
  const expired = reportTimeline({ ...report, state: 'expired', fundedDate: null, expiredDate: '2026-12-05T12:00:00Z' });
  expect(expired.map(step => step.label)).toEqual(['Reported by Hayden', 'Report expired without a confirmed cleanup']);
});

it('records every donation with its amount, visible donor name, and precise confirmation time', () => {
  const timeline = reportTimeline({ ...report, contributorCredit: {
    report_id: report.id, names: ['Donor'], anonymous_count: 1,
    donations: [
      { name: 'Donor', amountCents: 2500, donatedAt: '2026-11-06T21:47:00Z' },
      { name: null, amountCents: 500, donatedAt: '2026-11-06T21:45:00Z' },
      { name: 'Donor', amountCents: 2500, donatedAt: '2026-11-06T21:43:00Z' },
    ],
  } });
  const donations = timeline.filter(step => step.label.includes('donated'));
  expect(donations.map(step => step.label)).toEqual([
    '$25.00 donated by Donor', '$5.00 donated anonymously', '$25.00 donated by Donor',
  ]);
  expect(donations.map(step => step.date)).toEqual([
    'November 6, 2026 at 9:43 PM UTC', 'November 6, 2026 at 9:45 PM UTC', 'November 6, 2026 at 9:47 PM UTC',
  ]);
  expect(timeline.some(step => step.label === 'First donation received')).toBe(false);
});

it('words distances for people', () => {
  expect(distanceLabel(0.02)).toBe('100 ft away');
  expect(distanceLabel(0.44)).toBe('0.4 mi away');
  expect(distanceLabel(12.6)).toBe('13 mi away');
});
