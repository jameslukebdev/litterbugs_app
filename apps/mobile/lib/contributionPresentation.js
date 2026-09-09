export const statusLabel = (status) => ({
  not_completed: 'Not completed',
  processing: 'Processing',
  needs_check: 'Check status',
  payment_pending: 'Payment pending',
  failed: 'Payment failed',
  refund_pending: 'Refund pending',
  refund_processing: 'Refund processing',
  refunded: 'Refunded',
  succeeded: 'Contribution received',
  paid_out: 'Paid to cleaner',
}[status] || 'Status unavailable');

export function paymentDisplayStatus(item, now = Date.now()) {
  if (item.status !== 'payment_pending') return item.status;
  if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(item.providerState)) return 'not_completed';
  if (item.providerState === 'processing') return 'processing';
  if (now - Date.parse(item.created_at) > 24 * 60 * 60 * 1000) return 'needs_check';
  return item.status;
}
export const statusMessage = (item) => item.verificationUnavailable ? 'Status could not be verified. Please retry before making another payment.' : ({
  not_completed: 'Stripe confirms this payment has not completed. Return to the original contribution to continue, or contact support if the report is unavailable.',
  processing: 'Stripe is still processing this payment. Please wait before trying another payment.',
  needs_check: 'This older attempt needs a status check. Open payment details before trying another payment.',
  payment_pending: 'Payment has not been confirmed. View payment details for the latest recorded status.',
  failed: 'This payment did not complete.',
  refund_pending: 'A refund has been requested.',
  refund_processing: 'Your refund is being processed.',
  refunded: 'The contribution was refunded.',
  succeeded: 'Your contribution is in the cleanup fund.',
  paid_out: 'This contribution was included in the cleaner’s reward.',
}[paymentDisplayStatus(item)] || 'Check payment details for the latest recorded status.');

export const formatContributionDate = (value) => new Date(value).toLocaleString(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

