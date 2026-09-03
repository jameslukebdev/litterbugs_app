import { describe, expect, it } from 'vitest';

import { fundingAvailabilityPresentation } from './fundingAvailability';

describe('funding availability presentation', () => {
  it('opens payment only for eligible reports', () => {
    expect(fundingAvailabilityPresentation({ funding_eligibility: 'eligible' })).toBeNull();
  });

  it('explains every waiting or blocked state', () => {
    expect(fundingAvailabilityPresentation({ funding_eligibility: 'pending' })?.title)
      .toBe('Checking funding eligibility');
    expect(fundingAvailabilityPresentation({ funding_eligibility: 'safety_hold' })?.title)
      .toBe('Safety review in progress');
    expect(fundingAvailabilityPresentation({ funding_eligibility: 'better_photos' })?.title)
      .toBe('Better photos are needed first');
    expect(fundingAvailabilityPresentation({ funding_eligibility: 'ineligible' })?.title)
      .toBe('Cleanup fund unavailable');
  });
});
