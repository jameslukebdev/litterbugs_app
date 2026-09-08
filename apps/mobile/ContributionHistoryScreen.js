import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatUsd, loadMyContributions } from './lib/funding';
import BrandedLoadingState from './BrandedLoadingState';

const statusLabel = (status) => ({
  payment_pending: 'Payment pending',
  failed: 'Payment failed',
  refund_pending: 'Refund pending',
  refund_processing: 'Refund processing',
  refunded: 'Refunded',
  succeeded: 'Contribution received',
  paid_out: 'Paid to cleaner',
}[status] || status);

const statusMessage = (item) => ({
  payment_pending: 'Payment has not been confirmed. Open the report to check your saved attempt.',
  failed: 'This payment did not complete.',
  refund_pending: 'A refund has been requested.',
  refund_processing: 'Your refund is being processed.',
  refunded: 'The contribution was refunded.',
  succeeded: 'Your contribution is in the cleanup fund.',
  paid_out: 'This contribution was included in the cleaner’s reward.',
}[item.status] || 'Open the report for the latest cleanup status.');

const formatContributionDate = (value) => new Date(value).toLocaleString(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export default function ContributionHistoryScreen({ navigation }) {
  const [completedOnly, setCompletedOnly] = useState(false);
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    try {
      setItems(await loadMyContributions());
      setError(false);
    } catch {
      setError(true);
    } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#2F7D32" />}
    >
      <View style={[styles.line, { marginBottom: 18, gap: 12 }]}>{[[false,'All payments'],[true,'Completed impact']].map(([value,label]) => <TouchableOpacity key={label} accessibilityRole="button" accessibilityState={{selected:completedOnly===value}} onPress={() => setCompletedOnly(value)} style={[styles.statusPill,{minHeight:44,backgroundColor:completedOnly===value?'#E3EEE4':'#FFFFFF'}]}><Text style={styles.status}>{label}</Text></TouchableOpacity>)}</View>
      {error ? <Text style={styles.error}>Contribution history couldn’t be loaded. Pull down to try again.</Text> : null}
      {!loading && !error && items.filter((item) => !completedOnly || (item.report?.cleanup_state === 'completed' && ['succeeded','paid_out'].includes(item.status))).length === 0 ? (
        <View style={styles.empty}><Ionicons name="receipt-outline" size={42} color="#6D777D" /><Text style={styles.emptyTitle}>No payments in this view yet</Text></View>
      ) : items.filter((item) => !completedOnly || (item.report?.cleanup_state === 'completed' && ['succeeded','paid_out'].includes(item.status))).map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.line}>
            <Text style={styles.amount}>{formatUsd(item.principal_amount_cents)}</Text>
            <View style={styles.statusPill}><Text style={styles.status}>{statusLabel(item.status)}</Text></View>
          </View>
          <Text style={styles.reportTitle} numberOfLines={2}>
            {item.report?.title || 'Litter cleanup report'}
          </Text>
          <Text style={styles.statusMessage}>{statusMessage(item)}</Text>
          <Text style={styles.date}>{formatContributionDate(item.created_at)}</Text>
          <View style={styles.breakdown}><Text style={styles.muted}>Litterbugs fee</Text><Text style={styles.muted}>{formatUsd(item.platform_fee_cents)}</Text></View>
          <View style={styles.breakdown}><Text style={styles.total}>{['payment_pending','failed'].includes(item.status) ? 'Attempted total' : item.status === 'refunded' ? 'Original total' : 'Total charged'}</Text><Text style={styles.total}>{formatUsd(item.total_amount_cents)}</Text></View>
          <TouchableOpacity accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => navigation.navigate('App', { screen: 'Map', params: { reportId: item.report_id } })}><Text style={styles.status}>View report</Text></TouchableOpacity>
          {item.refunded_at ? <Text style={styles.date}>Refunded {formatContributionDate(item.refunded_at)}</Text> : null}
        </View>
      ))}
      {loading && items.filter((item) => !completedOnly || (item.report?.cleanup_state === 'completed' && ['succeeded','paid_out'].includes(item.status))).length === 0 ? (
        <BrandedLoadingState compact title="Loading contributions…" message="Checking payment and refund status." />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 18, backgroundColor: '#F5F6F7' },
  error: { padding: 16, color: '#A33A32', textAlign: 'center' },
  empty: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 12, color: '#59636A', fontSize: 17, fontWeight: '800' },
  card: { marginBottom: 13, padding: 17, borderRadius: 16, backgroundColor: '#FFFFFF' },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount: { color: '#245F2A', fontSize: 22, fontWeight: '900' },
  statusPill: { minHeight: 30, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#EDF5EE' },
  status: { color: '#315F35', fontSize: 12, fontWeight: '900' },
  reportTitle: { marginTop: 11, color: '#30363B', fontSize: 16, lineHeight: 21, fontWeight: '900' },
  statusMessage: { marginTop: 5, color: '#5F696F', fontSize: 13, lineHeight: 18 },
  date: { marginTop: 6, marginBottom: 12, color: '#7A8389', fontSize: 12 },
  breakdown: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  muted: { color: '#6B747A', fontSize: 14 },
  total: { color: '#30363B', fontSize: 14, fontWeight: '800' },
});
