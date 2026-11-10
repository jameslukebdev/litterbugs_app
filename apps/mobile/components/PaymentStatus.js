import { Text } from 'react-native';
import { paymentTone, statusColors } from '../lib/statusColors';
import { statusLabel } from '../lib/contributionPresentation';
// Coloured text on white, as on the website; no tinted chip behind it.
export default function PaymentStatus({ status }) {
  const tone = statusColors[paymentTone(status)];
  return <Text style={{ alignSelf: 'flex-start', maxWidth: '70%', color: tone.color, fontSize: 13, fontWeight: '800' }}>{statusLabel(status)}</Text>;
}
