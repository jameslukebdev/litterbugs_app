import { describe, expect, it } from 'vitest';

import {
  EMPTY_REPORT_DRAFT,
  getDistanceMiles,
  hasReportCoordinates,
  isWithinReportDistance,
  requiresRemoteReportConfirmation,
  reportInsertFromDraft,
  validateReportDraft,
} from './report';

describe('report contract', () => {
  it('requires a litter type and severity just like mobile', () => {
    expect(validateReportDraft(EMPTY_REPORT_DRAFT)).toEqual({
      types: 'Select at least one litter type to continue.',
      severity: 'Choose a severity level to continue.',
    });
  });

  it('normalizes an app-shaped draft into the existing report columns', () => {
    const insert = reportInsertFromDraft(
      {
        ...EMPTY_REPORT_DRAFT,
        selectedTypes: ['Bottles'],
        severity: 'Medium',
      },
      { latitude: 35.6, longitude: -82.55 },
      'user-123',
    );

    expect(insert).toMatchObject({
      title: 'Litter Report',
      litter_types: ['Bottles'],
      severity: 'Medium',
      latitude: 35.6,
      longitude: -82.55,
      user_id: 'user-123',
    });
    expect(insert).not.toHaveProperty('funding');
  });

  it('allows up to fifty miles and identifies the remote confirmation range', () => {
    const origin = { latitude: 35.994, longitude: -78.8986 };
    const nearby = { latitude: 36.08, longitude: -78.8986 };
    const remote = { latitude: 36.55, longitude: -78.8986 };
    const blocked = { latitude: 36.8, longitude: -78.8986 };

    expect(getDistanceMiles(origin, origin)).toBe(0);
    expect(isWithinReportDistance(origin, nearby)).toBe(true);
    expect(requiresRemoteReportConfirmation(origin, nearby)).toBe(false);
    expect(isWithinReportDistance(origin, remote)).toBe(true);
    expect(requiresRemoteReportConfirmation(origin, remote)).toBe(true);
    expect(isWithinReportDistance(origin, blocked)).toBe(false);
  });

  it('only exposes reports with complete coordinates to map clients', () => {
    const report = {
      id: 'report-123',
      latitude: 35.994,
      longitude: -78.8986,
    } as Parameters<typeof hasReportCoordinates>[0];

    expect(hasReportCoordinates(report)).toBe(true);
    expect(hasReportCoordinates({ ...report, latitude: null })).toBe(false);
    expect(hasReportCoordinates({ ...report, longitude: null })).toBe(false);
  });
});
