import { expect, it } from 'vitest';
import { paymentDisplayStatus, statusMessage } from './contributionPresentation';
const attempt = {status:'payment_pending',created_at:'2026-01-01T00:00:00Z'};
it('does not turn an old attempt into a failed or charged payment', () => {
  expect(paymentDisplayStatus(attempt)).toBe('needs_check');
  expect(statusMessage(attempt)).toContain('before paying again');
});
it('distinguishes authoritative incomplete, processing and unavailable status', () => {
  expect(paymentDisplayStatus({...attempt,providerState:'requires_payment_method'})).toBe('not_completed');
  expect(paymentDisplayStatus({...attempt,providerState:'processing'})).toBe('processing');
  expect(statusMessage({...attempt,verificationUnavailable:true})).toContain('couldn’t confirm');
  expect(paymentDisplayStatus({...attempt,status:'refunded',providerState:'succeeded'})).toBe('refunded');
});
