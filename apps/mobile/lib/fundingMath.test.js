import { describe, expect, it } from 'vitest';

import {
  calculatePlatformFee,
  parseContributionAmount,
} from './fundingMath';

describe('cleanup funding amounts', () => {
  it('accepts the exact $1 and $1,000 contribution limits', () => {
    expect(parseContributionAmount('1')).toBe(100);
    expect(parseContributionAmount('1000.00')).toBe(100_000);
  });

  it('rejects amounts outside the limits or with fractional cents', () => {
    expect(parseContributionAmount('0.99')).toBeNull();
    expect(parseContributionAmount('1000.01')).toBeNull();
    expect(parseContributionAmount('25.001')).toBeNull();
    expect(parseContributionAmount('abc')).toBeNull();
  });

  it('rounds the ten percent fee to the nearest cent', () => {
    expect(calculatePlatformFee(500)).toBe(50);
    expect(calculatePlatformFee(501)).toBe(50);
    expect(calculatePlatformFee(505)).toBe(51);
    expect(calculatePlatformFee(506)).toBe(51);
    expect(calculatePlatformFee(100_000)).toBe(10_000);
  });
});
