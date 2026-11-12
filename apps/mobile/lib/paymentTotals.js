// Money in and out for one member, for the summary at the top of Payments and the
// "earnings are waiting" prompt. Amounts are cents.
const DONATED = ['succeeded', 'paid_out'];

/**
 * `donatedCents`: what the member was charged for contributions that went through (not
 * failed, pending or refunded). `earnedCents`: rewards already sent to their payout
 * account, for cleanups and for reports. `onTheWayCents`: approved rewards not sent yet.
 * `reporterWaitingCents`: reporter rewards that cannot be sent until payouts are set up.
 */
export function paymentTotals({ contributions = [], reporterRewards = [], cleanups = [] } = {}) {
  const cents = value => Math.max(0, Math.round(Number(value) || 0));
  const sum = (items, pick) => items.reduce((total, item) => total + cents(pick(item)), 0);
  const paidCleanups = cleanups.filter(attempt => attempt?.is_paid);
  const unsent = ['pending', 'processing'];
  const reporterWaitingCents = sum(reporterRewards.filter(reward => reward?.status === 'pending'), reward => reward.amount_cents);
  return {
    donatedCents: sum(contributions.filter(item => DONATED.includes(item?.status)), item => item.total_amount_cents),
    earnedCents: sum(reporterRewards.filter(reward => reward?.status === 'transferred'), reward => reward.amount_cents)
      + sum(paidCleanups.filter(attempt => attempt.payout_status === 'transferred'), attempt => attempt.reward_amount_cents),
    onTheWayCents: sum(reporterRewards.filter(reward => unsent.includes(reward?.status)), reward => reward.amount_cents)
      + sum(paidCleanups.filter(attempt => unsent.includes(attempt.payout_status)), attempt => attempt.reward_amount_cents),
    reporterWaitingCents,
    // Charged but not yet confirmed by the bank or Stripe: listed below as "Confirmation needed".
    donationsUnconfirmedCents: sum(contributions.filter(item => ['payment_pending', 'processing'].includes(item?.status)), item => item.total_amount_cents),
  };
}

/** True when reporter rewards are waiting and the member's payout account cannot receive them yet. */
export function shouldPromptReporterPayout(totals, payoutStatus) {
  return totals?.reporterWaitingCents > 0 && Boolean(payoutStatus) && payoutStatus.payoutsEnabled !== true;
}
