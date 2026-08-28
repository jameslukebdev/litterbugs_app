import { describe, expect, it } from 'vitest';

import { calculatePlatformFee, parseContributionAmount } from '@/lib/funding';

describe('web cleanup funding amounts', () => {
  it('accepts the agreed contribution range with at most two decimals', () => {
    expect(parseContributionAmount('5')).toBe(500);
    expect(parseContributionAmount('25.50')).toBe(2550);
    expect(parseContributionAmount('5000')).toBe(500_000);
  });

  it('rejects out-of-range or ambiguous amounts', () => {
    expect(parseContributionAmount('4.99')).toBeNull();
    expect(parseContributionAmount('5000.01')).toBeNull();
    expect(parseContributionAmount('25.555')).toBeNull();
    expect(parseContributionAmount('abc')).toBeNull();
  });

  it('matches the backend half-up 10 percent fee calculation', () => {
    expect(calculatePlatformFee(500)).toBe(50);
    expect(calculatePlatformFee(505)).toBe(51);
    expect(calculatePlatformFee(500_000)).toBe(50_000);
  });
});
