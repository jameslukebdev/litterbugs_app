import { describe, expect, it } from 'vitest';
import { getCommunity } from './community-directory';
import { communityReceiptReportHref, communityReportHref, communityReportMapHref, communityReturnFromEntry, communityReturnPath, contributionReturnPath, reportEntryContext } from './community-journey';
const boone = getCommunity('us-nc-boone')!;
describe('community participation journeys', () => {
  it('keeps the area and return destination through a fresh report entry and sign-in', () => {
    const next = communityReportHref(boone);
    const url = new URL(next, 'https://litterbugs.app');
    expect(url.pathname).toBe('/report');
    expect(url.searchParams.get('community')).toBe(boone.slug);
    expect(url.searchParams.get('area')).toBe(`community-${boone.slug}`);
    expect(url.searchParams.get('returnTo')).toBe(boone.href);
    expect(reportEntryContext(boone.slug)?.next).toBe(next);
    expect(communityReturnFromEntry(next)).toBe(boone.href);
  });
  it('opens a specific report with the selected participation intent', () => {
    for (const intent of ['fund', 'clean'] as const) {
      const url = new URL(communityReportMapHref('report/with spaces', boone.slug, intent), 'https://litterbugs.app');
      expect(url.pathname).toBe('/map');
      expect(url.searchParams.get('report')).toBe('report/with spaces');
      expect(url.searchParams.get('intent')).toBe(intent);
      expect(url.searchParams.get('returnTo')).toBe(boone.href);
    }
  });
  it('keeps only recognized community context through a payment redirect and receipt', () => {
    const url = new URL(contributionReturnPath('report', 'receipt', boone.href), 'https://litterbugs.app');
    expect(url.searchParams.get('returnTo')).toBe(boone.href);
    expect(communityReceiptReportHref('report', boone.href)).toBe(communityReportMapHref('report', boone.slug));
    expect(communityReceiptReportHref('report', null)).toBe('/account/reports/report?from=payments');
  });
  it.each(['https://evil.example', '//evil.example', '/communities/us/nc/boone/../other', '/account/payments', ['/communities/us/nc/boone'], null])('rejects unrecognized return context: %j', value => {
    expect(communityReturnPath(value)).toBeNull();
    expect(contributionReturnPath('report', 'receipt', value)).not.toContain('returnTo');
  });
  it('rejects unknown or repeated community parameters without disturbing ordinary reporting', () => {
    expect(reportEntryContext('made-up')).toBeNull();
    expect(reportEntryContext([boone.slug])).toBeNull();
    expect(communityReportMapHref('report')).toBe('/map?report=report');
    expect(communityReturnFromEntry('//evil.example/report?community=us-nc-boone')).toBeNull();
  });
});
