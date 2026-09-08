import { describe, expect, it } from 'vitest';

import { payoutConnectionPresentation } from './payoutConnectionPresentation';

describe('Stripe payout connection presentation', () => {
  it('shows connected only when Stripe confirms payouts are enabled', () => {
    expect(payoutConnectionPresentation({
      status: { onboardingStatus: 'complete', payoutsEnabled: true },
    })).toMatchObject({
      label: 'Stripe connected',
      icon: 'checkmark-circle',
      color: '#2F7D32',
    });
  });

  it.each([
    null,
    { onboardingStatus: 'not_started', payoutsEnabled: false },
    { onboardingStatus: 'pending', payoutsEnabled: false },
  ])('shows not connected when payouts are not enabled', (status) => {
    expect(payoutConnectionPresentation({ status })).toMatchObject({
      label: 'Stripe not connected',
      icon: 'close-circle',
      color: '#C62828',
    });
  });

  it('does not mistake loading or request failures for disconnection', () => {
    expect(payoutConnectionPresentation({ loading: true }).label)
      .toBe('Checking Stripe connection…');
    expect(payoutConnectionPresentation({ error: true })).toMatchObject({
      label: 'Stripe status unavailable',
      detail: 'Tap to try again',
    });
  });
});
