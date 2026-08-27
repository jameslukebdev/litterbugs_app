import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatUsd, loadMyContributions } from './lib/funding';

const statusLabel = (status) => ({
  payment_pending: 'Processing',
  succeeded: 'In cleanup fund',
  refund_pending: 'Refund processing',
  refund_processing: 'Refund processing',
  refunded: 'Refunded',
  failed: 'Not completed',
  paid_out: 'Paid to cleaner',
}[status] || status);

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
          <View style={styles.line}><Text style={styles.amount}>{formatUsd(item.principal_amount_cents)}</Text><Text style={styles.status}>{statusLabel(item.status)}</Text></View>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
          <View style={styles.breakdown}><Text style={styles.muted}>Litterbugs fee</Text><Text style={styles.muted}>{formatUsd(item.platform_fee_cents)}</Text></View>
          <View style={styles.breakdown}><Text style={styles.total}>Total charged</Text><Text style={styles.total}>{formatUsd(item.total_amount_cents)}</Text></View>
        </View>
      ))}
      {loading && items.length === 0 ? <ActivityIndicator style={styles.loader} color="#2F7D32" /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 18, backgroundColor: '#F5F6F7' },
  loader: { marginTop: 50 },
  error: { padding: 16, color: '#A33A32', textAlign: 'center' },
  empty: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 12, color: '#59636A', fontSize: 17, fontWeight: '800' },
  card: { marginBottom: 13, padding: 17, borderRadius: 16, backgroundColor: '#FFFFFF' },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount: { color: '#245F2A', fontSize: 22, fontWeight: '900' },
  status: { color: '#59636A', fontSize: 13, fontWeight: '800' },
  date: { marginTop: 4, marginBottom: 12, color: '#7A8389', fontSize: 13 },
  breakdown: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  muted: { color: '#6B747A', fontSize: 14 },
  total: { color: '#30363B', fontSize: 14, fontWeight: '800' },
});
