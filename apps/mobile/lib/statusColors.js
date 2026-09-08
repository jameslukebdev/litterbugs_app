export const statusColors = Object.freeze({
  neutral: { color: '#59636A', backgroundColor: '#F1F4F2' },
  success: { color: '#245F2A', backgroundColor: '#EAF4EC' },
  pending: { color: '#805C00', backgroundColor: '#FFF5DB' },
  error: { color: '#B42318', backgroundColor: '#FDEEEB' },
});
export function paymentTone(status) {
  if (['payment_pending', 'refund_pending', 'refund_processing'].includes(status)) return 'pending';
  if (status === 'failed') return 'error';
  if (['succeeded', 'paid_out'].includes(status)) return 'success';
  return 'neutral';
}
