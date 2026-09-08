import { describe, expect, it } from 'vitest';

import {
  fundingAvailabilityPresentation,
  fundingReviewCompletionPresentation,
  shouldRefreshFundingEligibility,
} from './fundingAvailability';

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

  it('keeps checking new reports while funding eligibility is pending', () => {
    expect(shouldRefreshFundingEligibility({ funding_eligibility: 'pending' })).toBe(true);
    expect(shouldRefreshFundingEligibility({ funding_eligibility: 'safety_hold' })).toBe(true);
    expect(shouldRefreshFundingEligibility({ funding_eligibility: 'eligible' })).toBe(false);
    expect(shouldRefreshFundingEligibility({ funding_eligibility: 'better_photos' })).toBe(false);
  });

  it('presents the completed photo-review result after a waiting state', () => {
    expect(fundingReviewCompletionPresentation('pending', {
      funding_eligibility: 'eligible',
    })).toEqual({
      title: 'Photo review complete',
      message: 'This report is approved for funding. You can now complete your secure Stripe payment.',
    });
    expect(fundingReviewCompletionPresentation('safety_hold', {
      funding_eligibility: 'ineligible',
      funding_hold_reason: 'The location is not eligible for funded cleanup.',
    })?.message).toBe('The location is not eligible for funded cleanup.');
  });

  it('does not replay completion messaging for an already final result', () => {
    expect(fundingReviewCompletionPresentation('eligible', {
      funding_eligibility: 'eligible',
    })).toBeNull();
    expect(fundingReviewCompletionPresentation('pending', {
      funding_eligibility: 'safety_hold',
    })).toBeNull();
  });
});
