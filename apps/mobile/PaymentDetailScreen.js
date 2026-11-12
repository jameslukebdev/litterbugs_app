import FeeExplanationLabel from './components/FeeExplanationLabel';
import { useCallback } from 'react';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';
import useFocusedResource from './lib/useFocusedResource';
import { useSession } from './lib/session';
import LoadingBee from './components/LoadingBee';
import { ErrorText, TextLink } from './components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatUsd, loadMyContribution } from './lib/funding';
import PaymentStatus from './components/PaymentStatus';
import { statusMessage, paymentDisplayStatus, formatContributionDate } from './lib/contributionPresentation';
import { colors, fonts } from './lib/theme';

export default function PaymentDetailScreen({ navigation, route }) {
  const { user } = useSession();
  const contributionId = route.params?.contributionId;
  const record = useFocusedResource(useCallback(() => loadMyContribution(contributionId, user?.id, { verify: false }), [contributionId, user?.id]), { enabled: Boolean(user?.id && contributionId) });
  const verification = useFocusedResource(useCallback(() => loadMyContribution(contributionId, user?.id), [contributionId, user?.id]), { enabled: Boolean(record.data?.status === 'payment_pending') });
  const item = verification.data || record.data;
  const loading = record.loading || verification.loading;
  const error = record.error || verification.error;
  const load = () => { record.refresh(); verification.refresh(); };
  const insets = useSafeAreaInsets();
  const action = (label, onPress, disabled = false) => <TextLink align="start" label={label} onPress={onPress} disabled={disabled} style={{ minHeight: 52 }} />;
  return <ScrollView style={{ backgroundColor: colors.white }} contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: insets.bottom + 24 }}>
    {loading && !item ? <LoadingBee label="Loading payment details" /> : null}
    {error ? <ErrorText style={{ marginTop: 0, marginBottom: 16 }}>Couldn’t refresh this payment. Try again.</ErrorText> : null}
    {item ? <>
      <PaymentStatus status={paymentDisplayStatus(item)} />
      <Text style={{ fontSize: 30, fontFamily: fonts.heading, color: colors.ink, marginTop: 20 }}>{formatUsd(item.total_amount_cents)}</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>{['payment_pending', 'failed'].includes(item.status) ? 'Payment amount' : item.status === 'refunded' ? 'Original total' : 'Total charged'}</Text>
      <Text style={{ marginTop: 20, fontSize: 16, lineHeight: 23 }}>{!item.report && paymentDisplayStatus(item) === 'not_completed' ? 'This payment hasn’t completed. The report is unavailable; get payment help below if you need assistance.' : statusMessage(item)}</Text>
      {item.checkedAt ? <Text style={{ marginTop: 12, color: colors.muted }}>Last checked {formatContributionDate(item.checkedAt)}</Text> : null}
      <Text style={{ marginTop: 12, color: colors.muted }}>{formatContributionDate(item.created_at)}</Text>
      <View style={{ marginVertical: 20, gap: 14, padding: 16, borderRadius: 14, backgroundColor: colors.primaryTint }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}><Text>Cleanup contribution</Text><Text>{formatUsd(item.principal_amount_cents)}</Text></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}><FeeExplanationLabel label="Service fee" /><Text>{formatUsd(item.platform_fee_cents)}</Text></View>
        {item.refunded_at ? <Text>Refunded: {formatContributionDate(item.refunded_at)}</Text> : null}
      </View>
      {item.report ? action('View cleanup report', () => navigation.popTo('App', { screen: 'Map', params: { reportId: item.report_id } })) : <Text style={{ color: colors.muted, lineHeight: 21 }}>The linked report is no longer available. Your payment record remains here.</Text>}
    </> : !loading && !error ? <Text>This payment record is unavailable.</Text> : null}
    {item || error ? action(loading ? 'Updating…' : 'Refresh payment details', load, loading) : null}
    {action('Get payment help', async () => {
      try { await Linking.openURL(`mailto:admin@litterbugs.app?subject=${encodeURIComponent('Payment help')}&body=${encodeURIComponent(`Payment reference: ${contributionId || 'Unavailable'}\n\n`)}`); }
      catch { Alert.alert('Payment help', `Email admin@litterbugs.app with payment reference ${contributionId || 'Unavailable'}.`); }
    })}
  </ScrollView>;
}
