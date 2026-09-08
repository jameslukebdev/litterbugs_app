import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REPORT_FILTERS as defaults,
  matchesReportFilters,
  distanceMiles,
} from './reportFilters';
const report = {
  title: 'Roadside bottles',
  severity: 'Low',
  cleanup_state: 'available',
  funded_amount_cents: 600,
  latitude: 36,
  longitude: -81,
};
describe('shared map and list filtering', () => {
  it('combines status, funding, severity and text rather than overriding earlier filters', () => {
    const filters = {
      ...defaults,
      status: 'available',
      funding: 'funded',
      severity: 'low',
      query: ' BOTTLES ',
    };
    expect(matchesReportFilters(report, filters, report)).toBe(true);
    expect(
      matchesReportFilters(
        { ...report, cleanup_state: 'completed' },
        filters,
        report,
      ),
    ).toBe(false);
    expect(
      matchesReportFilters(
        { ...report, funded_amount_cents: 0 },
        filters,
        report,
      ),
    ).toBe(false);
  });
  it('includes every intermediate cleanup state', () => {
    for (const cleanup_state of [
      'claimed',
      'completion_submitted',
      'changes_requested',
    ])
      expect(
        matchesReportFilters(
          { ...report, cleanup_state },
          { ...defaults, status: 'progress' },
          report,
        ),
      ).toBe(true);
  });
  it('filters radius from the shared map center and excludes unknown coordinates', () => {
    expect(
      matchesReportFilters(report, { ...defaults, radius: 5 }, report),
    ).toBe(true);
    expect(
      matchesReportFilters(
        { ...report, latitude: 37 },
        { ...defaults, radius: 5 },
        report,
      ),
    ).toBe(false);
    expect(
      matchesReportFilters(
        { ...report, latitude: null },
        { ...defaults, radius: 5 },
        report,
      ),
    ).toBe(false);
    expect(distanceMiles(report, { ...report, latitude: NaN })).toBeNull();
  });
  it('reset restores both funded and volunteer reports and completed cleanups', () => {
    expect(
      matchesReportFilters(
        { ...report, cleanup_state: 'completed', funded_amount_cents: 0 },
        defaults,
        null,
      ),
    ).toBe(true);
  });
});
