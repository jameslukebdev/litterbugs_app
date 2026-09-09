export const statusLabel = (status) => ({
  not_completed: 'Not completed',
  processing: 'Processing',
  needs_check: 'Confirmation needed',
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
export const statusMessage = (item) => item.verificationUnavailable ? 'We couldn’t confirm this payment. Try again before paying again.' : ({
  not_completed: 'This payment hasn’t completed. View the report to continue, or get payment help below.',
  processing: 'Your payment is processing. Please wait before paying again.',
  needs_check: 'We haven’t confirmed this payment yet. View details before paying again.',
  payment_pending: 'We haven’t confirmed this payment yet. View details before paying again.',
  failed: 'This payment did not complete.',
  refund_pending: 'A refund has been requested.',
  refund_processing: 'Your refund is being processed.',
  refunded: 'The contribution was refunded.',
  succeeded: 'Your contribution is in the cleanup fund.',
  paid_out: 'This contribution was included in the cleaner’s reward.',
}[paymentDisplayStatus(item)] || 'View payment details for an update.');

export const formatContributionDate = (value) => new Date(value).toLocaleString(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

