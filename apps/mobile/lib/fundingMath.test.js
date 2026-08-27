import { describe, expect, it } from 'vitest';

import {
  calculatePlatformFee,
  parseContributionAmount,
} from './fundingMath';

describe('cleanup funding amounts', () => {
  it('accepts the exact $5 and $5,000 contribution limits', () => {
    expect(parseContributionAmount('5')).toBe(500);
    expect(parseContributionAmount('5000.00')).toBe(500_000);
  });

  it('rejects amounts outside the limits or with fractional cents', () => {
    expect(parseContributionAmount('4.99')).toBeNull();
    expect(parseContributionAmount('5000.01')).toBeNull();
    expect(parseContributionAmount('25.001')).toBeNull();
    expect(parseContributionAmount('abc')).toBeNull();
  });

  it('rounds the ten percent fee to the nearest cent', () => {
    expect(calculatePlatformFee(500)).toBe(50);
    expect(calculatePlatformFee(501)).toBe(50);
    expect(calculatePlatformFee(505)).toBe(51);
    expect(calculatePlatformFee(506)).toBe(51);
    expect(calculatePlatformFee(500_000)).toBe(50_000);
  });
});
