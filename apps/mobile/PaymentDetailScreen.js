import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatUsd, loadMyContribution } from './lib/funding';
import PaymentStatus from './components/PaymentStatus';
import { statusMessage, formatContributionDate } from './ContributionHistoryScreen';

export default function PaymentDetailScreen({ navigation, route }) {
  const [item, setItem] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(false);
  const insets = useSafeAreaInsets();
  const load = useCallback(async () => {
    setLoading(true);
    try { setItem(await loadMyContribution(route.params.contributionId)); setError(false); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, [route.params.contributionId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const action = (label, onPress, disabled = false) => <TouchableOpacity disabled={disabled} accessibilityRole="button" onPress={onPress} style={{ minHeight: 52, justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}><Text style={{ color: '#2F7D32', fontSize: 16, fontWeight: '700' }}>{label}</Text></TouchableOpacity>;
  return <ScrollView style={{ backgroundColor: '#FFFFFF' }} contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: insets.bottom + 24 }}>
    {error ? <Text style={{ color: '#B42318', marginBottom: 16 }}>Couldn’t refresh this payment. Try again.</Text> : null}
    {item ? <>
      <PaymentStatus status={item.status} />
      <Text style={{ fontSize: 32, fontWeight: '800', marginTop: 20 }}>{formatUsd(item.total_amount_cents)}</Text>
      <Text style={{ color: '#687178', marginTop: 4 }}>{['payment_pending', 'failed'].includes(item.status) ? 'Attempted total' : item.status === 'refunded' ? 'Original total' : 'Total charged'}</Text>
      <Text style={{ marginTop: 20, fontSize: 16, lineHeight: 23 }}>{statusMessage(item).replace('View payment details for the latest recorded status.', 'Refresh below to check the latest recorded status.')}</Text>
      <Text style={{ marginTop: 12, color: '#687178' }}>{formatContributionDate(item.created_at)}</Text>
      <View style={{ marginVertical: 24, gap: 12 }}>
        <Text>Cleanup contribution: {formatUsd(item.principal_amount_cents)}</Text>
        <Text>Litterbugs fee: {formatUsd(item.platform_fee_cents)}</Text>
        {item.refunded_at ? <Text>Refunded: {formatContributionDate(item.refunded_at)}</Text> : null}
      </View>
      {item.report ? action('View cleanup report', () => navigation.navigate('App', { screen: 'Map', params: { reportId: item.report_id } })) : <Text style={{ color: '#687178', lineHeight: 21 }}>The linked report is no longer available. Your payment record remains here.</Text>}
    </> : !loading && !error ? <Text>This payment record is unavailable.</Text> : null}
    {action(loading ? 'Checking status…' : 'Refresh payment status', load, loading)}
    {action('Get payment help', async () => {
      try { await Linking.openURL(`mailto:support@litterbugs.app?subject=${encodeURIComponent('Payment help')}&body=${encodeURIComponent(`Payment reference: ${route.params.contributionId}\n\n`)}`); }
      catch { Alert.alert('Payment help', `Email support@litterbugs.app with payment reference ${route.params.contributionId}.`); }
    })}
    <Text selectable style={{ marginTop: 12, fontSize: 12, color: '#687178' }}>Reference: {route.params.contributionId}</Text>
  </ScrollView>;
}
