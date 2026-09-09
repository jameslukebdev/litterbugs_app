import FeeExplanationLabel from './components/FeeExplanationLabel';
import { useCallback } from 'react';
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import useFocusedResource from './lib/useFocusedResource';
import { useSession } from './lib/session';
import BrandedLoadingState from './BrandedLoadingState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatUsd, loadMyContribution } from './lib/funding';
import PaymentStatus from './components/PaymentStatus';
import { statusMessage, paymentDisplayStatus, formatContributionDate } from './lib/contributionPresentation';

export default function PaymentDetailScreen({ navigation, route }) {
  const { user } = useSession();
  const contributionId = route.params?.contributionId;
  const { data: item, loading, error, refresh: load } = useFocusedResource(useCallback(() => loadMyContribution(contributionId, user?.id), [contributionId, user?.id]), { enabled: Boolean(user?.id && contributionId) });
  const insets = useSafeAreaInsets();
  const action = (label, onPress, disabled = false) => <TouchableOpacity disabled={disabled} accessibilityRole="button" onPress={onPress} style={{ minHeight: 52, justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}><Text style={{ color: '#2F7D32', fontSize: 16, fontWeight: '700' }}>{label}</Text></TouchableOpacity>;
  return <ScrollView style={{ backgroundColor: '#FFFFFF' }} contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: insets.bottom + 24 }}>
    {loading && !item ? <BrandedLoadingState compact title="Loading payment…" message="Checking the latest recorded status." /> : null}
    {error ? <Text style={{ color: '#B42318', marginBottom: 16 }}>Couldn’t refresh this payment. Try again.</Text> : null}
    {item ? <>
      <PaymentStatus status={paymentDisplayStatus(item)} />
      <Text style={{ fontSize: 32, fontWeight: '800', marginTop: 20 }}>{formatUsd(item.total_amount_cents)}</Text>
      <Text style={{ color: '#687178', marginTop: 4 }}>{['payment_pending', 'failed'].includes(item.status) ? 'Attempted total' : item.status === 'refunded' ? 'Original total' : 'Total charged'}</Text>
      <Text style={{ marginTop: 20, fontSize: 16, lineHeight: 23 }}>{statusMessage(item).replace('View payment details for the latest recorded status.', 'Refresh below to check the latest recorded status.')}</Text>
      {item.checkedAt ? <Text style={{ marginTop: 12, color: '#687178' }}>Verified with Stripe {formatContributionDate(item.checkedAt)}</Text> : null}
      <Text style={{ marginTop: 12, color: '#687178' }}>{formatContributionDate(item.created_at)}</Text>
      <View style={{ marginVertical: 24, gap: 12 }}>
        <Text>Cleanup contribution: {formatUsd(item.principal_amount_cents)}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}><FeeExplanationLabel label="Litterbugs fee" /><Text>{formatUsd(item.platform_fee_cents)}</Text></View>
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
