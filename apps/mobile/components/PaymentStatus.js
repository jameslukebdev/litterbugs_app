import { Text, View } from 'react-native';
import { paymentTone, statusColors } from '../lib/statusColors';
import { statusLabel } from '../lib/contributionPresentation';
export default function PaymentStatus({ status }) {
  const colors = statusColors[paymentTone(status)];
  return <View style={{ alignSelf: 'flex-start', maxWidth: '70%', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: colors.backgroundColor }}><Text style={{ color: colors.color, fontSize: 12, fontWeight: '700' }}>{statusLabel(status)}</Text></View>;
}
