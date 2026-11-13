import { expect, it } from 'vitest';
import { paymentTotals, shouldPromptReporterPayout } from './paymentTotals';

const data = {
  contributions: [
    { status: 'succeeded', total_amount_cents: 600 }, { status: 'paid_out', total_amount_cents: 1200 },
    { status: 'refunded', total_amount_cents: 600 }, { status: 'failed', total_amount_cents: 600 }, { status: 'payment_pending', total_amount_cents: 600 },
  ],
  reporterRewards: [{ status: 'transferred', amount_cents: 50 }, { status: 'pending', amount_cents: 30 }, { status: 'failed', amount_cents: 25 }],
  cleanups: [
    { is_paid: true, payout_status: 'transferred', reward_amount_cents: 1000 }, { is_paid: true, payout_status: 'processing', reward_amount_cents: 500 },
    { is_paid: false, payout_status: null, reward_amount_cents: 0 },
  ],
};

it('counts only donations that went through and only rewards already sent', () => {
  expect(paymentTotals(data)).toEqual({ donatedCents: 1800, earnedCents: 1050, onTheWayCents: 530, reporterWaitingCents: 30 });
});
it('is all zero for a new member', () => {
  expect(paymentTotals()).toEqual({ donatedCents: 0, earnedCents: 0, onTheWayCents: 0, reporterWaitingCents: 0 });
});
it('prompts for payout setup only when reporter money is waiting and payouts are not ready', () => {
  const totals = paymentTotals(data);
  expect(shouldPromptReporterPayout(totals, { payoutsEnabled: false })).toBe(true);
  expect(shouldPromptReporterPayout(totals, { payoutsEnabled: true })).toBe(false);
  expect(shouldPromptReporterPayout(totals, null)).toBe(false); // status unknown: say nothing
  expect(shouldPromptReporterPayout(paymentTotals(), { payoutsEnabled: false })).toBe(false);
});
