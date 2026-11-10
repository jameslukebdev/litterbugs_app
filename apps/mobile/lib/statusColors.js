import { colors } from './theme';

export const statusColors = Object.freeze({
  neutral: { color: colors.muted, backgroundColor: colors.mist },
  success: { color: colors.done, backgroundColor: colors.doneSoft },
  pending: { color: colors.yellow, backgroundColor: colors.yellowSoft },
  error: { color: colors.red, backgroundColor: colors.redSoft },
});
export function paymentTone(status) {
  if (['payment_pending', 'refund_pending', 'refund_processing'].includes(status)) return 'pending';
  if (status === 'failed') return 'error';
  if (['succeeded', 'paid_out'].includes(status)) return 'success';
  return 'neutral';
}
