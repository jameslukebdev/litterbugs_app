import { describe, expect, it } from 'vitest';

import {
  evaluateReportLocationDistance,
  MAX_REPORT_DISTANCE_MILES,
  NEARBY_REPORT_DISTANCE_MILES,
  roundedDistanceLabel,
} from './reportLocationPolicy';

describe('report location distance policy', () => {
  it('allows nearby reports without another confirmation', () => {
    expect(evaluateReportLocationDistance(NEARBY_REPORT_DISTANCE_MILES)).toEqual({
      status: 'nearby',
      distanceMiles: 10,
    });
  });

  it('requires confirmation between 10 and 50 miles', () => {
    expect(evaluateReportLocationDistance(10.1).status).toBe('remote_confirmation_required');
    expect(evaluateReportLocationDistance(MAX_REPORT_DISTANCE_MILES).status)
      .toBe('remote_confirmation_required');
  });

  it('blocks reports beyond 50 miles and rejects invalid distances', () => {
    expect(evaluateReportLocationDistance(50.1).status).toBe('blocked');
    expect(evaluateReportLocationDistance(Number.NaN).status).toBe('invalid');
    expect(evaluateReportLocationDistance(-1).status).toBe('invalid');
  });

  it('uses a simple rounded distance in user-facing confirmation copy', () => {
    expect(roundedDistanceLabel(24.6)).toBe('25 miles');
  });
});
