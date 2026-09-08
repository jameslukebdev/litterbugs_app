import { Text, View } from 'react-native';
import { paymentTone, statusColors } from '../lib/statusColors';
const labels = { payment_pending: 'Payment pending', failed: 'Payment failed', refund_pending: 'Refund pending', refund_processing: 'Refund processing', refunded: 'Refunded', succeeded: 'Contribution received', paid_out: 'Paid to cleaner' };
export default function PaymentStatus({ status }) {
  const colors = statusColors[paymentTone(status)];
  return <View style={{ alignSelf: 'flex-start', maxWidth: '70%', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: colors.backgroundColor }}><Text style={{ color: colors.color, fontSize: 12, fontWeight: '700' }}>{labels[status] || 'Status unavailable'}</Text></View>;
}
