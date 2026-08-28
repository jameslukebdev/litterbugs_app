import { describe, expect, it } from 'vitest';

import { evaluatePaymentConfirmation } from './paymentConfirmation';

describe('funded-cleanup payment confirmation', () => {
  it('accepts only a Stripe-confirmed successful PaymentIntent', () => {
    expect(evaluatePaymentConfirmation({
      paymentIntent: { status: 'Succeeded' },
    })).toEqual({ confirmed: true, message: null });
  });

  it.each(['Processing', 'RequiresPaymentMethod', 'RequiresAction', 'Canceled', 'Unknown', undefined])(
    'does not show a receipt for %s',
    (status) => {
      const result = evaluatePaymentConfirmation({ paymentIntent: { status } });
      expect(result.confirmed).toBe(false);
      expect(result.message).toContain('Do not try the payment again');
    },
  );

  it('does not show a receipt when Stripe confirmation cannot be retrieved', () => {
    const result = evaluatePaymentConfirmation({ error: { message: 'Network unavailable' } });
    expect(result.confirmed).toBe(false);
    expect(result.message).toContain('could not confirm');
  });
});
