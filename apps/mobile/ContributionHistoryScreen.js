import FeeExplanationLabel from './components/FeeExplanationLabel';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useFocusedResource from './lib/useFocusedResource';
import { useSession } from './lib/session';
import { statusMessage, formatContributionDate } from './lib/contributionPresentation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatUsd, loadMyContributions } from './lib/funding';
import PaymentStatus from './components/PaymentStatus';
import BrandedLoadingState from './BrandedLoadingState';

export default function ContributionHistoryScreen({ navigation }) {
  const [completedOnly, setCompletedOnly] = useState(false);
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const history = useFocusedResource(useCallback(cursor => loadMyContributions({ userId: user?.id, cursor, completedOnly }), [user?.id, completedOnly]), { paged: true, enabled: Boolean(user?.id) });
  const { data: items, loading, error, refresh: load } = history;

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#2F7D32" />}
    >
      <View style={[styles.line, { marginBottom: 18, gap: 12 }]}>{[[false,'All payments'],[true,'Completed impact']].map(([value,label]) => <TouchableOpacity key={label} accessibilityRole="button" accessibilityState={{selected:completedOnly===value}} onPress={() => setCompletedOnly(value)} style={[styles.statusPill,{minHeight:44,backgroundColor:completedOnly===value?'#E3EEE4':'#FFFFFF'}]}><Text style={styles.status}>{label}</Text></TouchableOpacity>)}</View>
      {error ? <View><Text style={styles.error}>Couldn’t refresh payment history.</Text><TouchableOpacity accessibilityRole="button" style={styles.more} onPress={load}><Text style={styles.status}>Retry payment history</Text></TouchableOpacity></View> : null}
      {!loading && !error && items.length === 0 ? (
        <View style={styles.empty}><Ionicons name="receipt-outline" size={42} color="#6D777D" /><Text style={styles.emptyTitle}>{completedOnly ? 'No completed impact yet' : 'No payments yet'}</Text><Text style={styles.emptyCopy}>{completedOnly ? 'Contributions to completed cleanups will appear here.' : 'Your contributions and payment attempts will appear here.'}</Text></View>
      ) : items.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.line}>
            <Text style={styles.amount}>{formatUsd(item.principal_amount_cents)}</Text>
            <PaymentStatus status={item.status} />
          </View>
          <Text style={styles.reportTitle} numberOfLines={2}>
            {item.report?.title || 'Litter cleanup report'}
          </Text>
          <Text style={styles.statusMessage}>{statusMessage(item)}</Text>
          <Text style={styles.date}>{formatContributionDate(item.created_at)}</Text>
          <View style={styles.breakdown}><FeeExplanationLabel label="Litterbugs fee" textStyle={styles.muted} /><Text style={styles.muted}>{formatUsd(item.platform_fee_cents)}</Text></View>
          <View style={styles.breakdown}><Text style={styles.total}>{['payment_pending','failed'].includes(item.status) ? 'Attempted total' : item.status === 'refunded' ? 'Original total' : 'Total charged'}</Text><Text style={styles.total}>{formatUsd(item.total_amount_cents)}</Text></View>
          <TouchableOpacity accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => navigation.navigate('PaymentDetail', { contributionId: item.id })}><Text style={styles.status}>View payment details</Text></TouchableOpacity>
          {item.refunded_at ? <Text style={styles.date}>Refunded {formatContributionDate(item.refunded_at)}</Text> : null}
        </View>
      ))}
      {loading && items.length === 0 ? (
        <BrandedLoadingState compact title="Loading contributions…" message="Checking payment and refund status." />
      ) : null}
      {history.moreError ? <Text style={styles.error}>Couldn’t load older payments. Your current history is still available.</Text> : null}
      {history.nextCursor ? <TouchableOpacity accessibilityRole="button" disabled={loading || history.loadingMore} style={styles.more} onPress={history.loadMore}><Text style={styles.status}>{history.loadingMore ? 'Loading older payments…' : history.moreError ? 'Retry older payments' : 'Load older payments'}</Text></TouchableOpacity> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  more: { minHeight: 48, padding: 12, alignItems: 'center', justifyContent: 'center' },
  emptyCopy: { marginTop: 8, color: '#687178', textAlign: 'center', lineHeight: 21 },
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
