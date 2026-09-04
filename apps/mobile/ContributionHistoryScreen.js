import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatUsd, loadMyContributions } from './lib/funding';
import BrandedLoadingState from './BrandedLoadingState';

const statusLabel = (status) => ({
  payment_pending: 'Processing',
  succeeded: 'In cleanup fund',
  refund_pending: 'Refund processing',
  refund_processing: 'Refund processing',
  refunded: 'Refunded',
  failed: 'Not completed',
  paid_out: 'Paid to cleaner',
}[status] || status);

const statusMessage = (item) => ({
  payment_pending: 'Stripe is confirming this payment. No action is needed.',
  succeeded: 'Your contribution is in this report’s cleanup fund.',
  refund_pending: 'Your full charge is queued for a refund.',
  refund_processing: 'Stripe is processing your full refund.',
  refunded: 'Your full charge, including the Litterbugs fee, was refunded.',
  failed: 'The payment did not complete and was not added to the cleanup fund.',
  paid_out: 'This contribution was included in the cleaner’s reward.',
}[item.status] || 'Contribution status is being updated.');

const formatContributionDate = (value) => new Date(value).toLocaleString(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export default function ContributionHistoryScreen() {
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
      {error ? <Text style={styles.error}>Contribution history couldn’t be loaded. Pull down to try again.</Text> : null}
      {!loading && !error && items.length === 0 ? (
        <View style={styles.empty}><Ionicons name="receipt-outline" size={42} color="#6D777D" /><Text style={styles.emptyTitle}>No contributions yet</Text></View>
      ) : items.map((item) => (
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
          <View style={styles.breakdown}><Text style={styles.total}>Total charged</Text><Text style={styles.total}>{formatUsd(item.total_amount_cents)}</Text></View>
        </View>
      ))}
      {loading && items.length === 0 ? (
        <BrandedLoadingState compact title="Loading contributions…" message="Checking your cleanup fund activity." />
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
