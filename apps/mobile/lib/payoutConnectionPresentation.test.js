import { describe, expect, it } from 'vitest';

import { payoutConnectionPresentation } from './payoutConnectionPresentation';

describe('Stripe payout connection presentation', () => {
  it('shows connected only when Stripe confirms payouts are enabled', () => {
    expect(payoutConnectionPresentation({
      status: { onboardingStatus: 'complete', payoutsEnabled: true },
    })).toMatchObject({
      label: 'Ready to receive cleanup rewards',
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
      label: 'Set up payouts',
      icon: 'wallet-outline',
      color: '#59636A',
    });
  });

  it('does not mistake loading or request failures for disconnection', () => {
    expect(payoutConnectionPresentation({ loading: true }).label)
      .toBe('Updating payout details…');
    expect(payoutConnectionPresentation({ error: true })).toMatchObject({
      label: 'Couldn’t update payout details',
      detail: 'Tap to try again',
    });
  });
});

it('retains known payout status during background refresh', () => { expect(payoutConnectionPresentation({ loading: true, status: { payoutsEnabled: true } }).label).toBe('Ready to receive cleanup rewards'); });
