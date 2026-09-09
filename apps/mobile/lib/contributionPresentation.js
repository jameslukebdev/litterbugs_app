export const statusLabel = (status) => ({
  payment_pending: 'Payment pending',
  failed: 'Payment failed',
  refund_pending: 'Refund pending',
  refund_processing: 'Refund processing',
  refunded: 'Refunded',
  succeeded: 'Contribution received',
  paid_out: 'Paid to cleaner',
}[status] || 'Status unavailable');

export const statusMessage = (item) => ({
  payment_pending: 'Payment has not been confirmed. View payment details for the latest recorded status.',
  failed: 'This payment did not complete.',
  refund_pending: 'A refund has been requested.',
  refund_processing: 'Your refund is being processed.',
  refunded: 'The contribution was refunded.',
  succeeded: 'Your contribution is in the cleanup fund.',
  paid_out: 'This contribution was included in the cleaner’s reward.',
}[item.status] || 'Check payment details for the latest recorded status.');

export const formatContributionDate = (value) => new Date(value).toLocaleString(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

