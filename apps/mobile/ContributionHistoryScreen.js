import FeeExplanationLabel from './components/FeeExplanationLabel';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useFocusedResource from './lib/useFocusedResource';
import { useSession } from './lib/session';
import { statusMessage, paymentDisplayStatus, formatContributionDate } from './lib/contributionPresentation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatUsd, loadMyContributions } from './lib/funding';
import PaymentStatus from './components/PaymentStatus';

export default function ContributionHistoryScreen({ navigation }) {
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [completedOnly, setCompletedOnly] = useState(false);
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  // Keep each tab's own data and pagination; prefetch both to make switching instant.
  const allHistory = useFocusedResource(useCallback(cursor => loadMyContributions({ userId: user?.id, cursor, completedOnly: false }), [user?.id]), { paged: true, enabled: Boolean(user?.id), cacheKey: `payments:${user?.id}:all` });
  const completedHistory = useFocusedResource(useCallback(cursor => loadMyContributions({ userId: user?.id, cursor, completedOnly: true }), [user?.id]), { paged: true, enabled: Boolean(user?.id), cacheKey: `payments:${user?.id}:completed` });
  const history = completedOnly ? completedHistory : allHistory;
  const { data: items, loading, error, refresh: load, hasLoaded } = history;
  const [showWaiting, setShowWaiting] = useState(false);
  useEffect(() => {
    setShowWaiting(false);
    if (!loading || hasLoaded) return;
    const timer = setTimeout(() => setShowWaiting(true), 400);
    return () => clearTimeout(timer);
  }, [loading, hasLoaded, completedOnly]);

  return (
    <FlatList
      style={{ backgroundColor: '#FFFFFF' }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
      refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={async () => { setPullRefreshing(true); await load(); setPullRefreshing(false); }} tintColor="#2F7D32" />}
      data={items}
      keyExtractor={item => item.id}
      ListHeaderComponent={<>
      <View style={styles.tabs}>{[[false,'All payments'],[true,'Completed impact']].map(([value,label]) => <TouchableOpacity key={label} accessibilityRole="tab" accessibilityState={{selected:completedOnly===value}} onPress={() => setCompletedOnly(value)} style={[styles.tab, completedOnly === value && styles.tabSelected]}><Text style={styles.status}>{label}</Text></TouchableOpacity>)}</View>
      {error ? <View><Text style={styles.error}>Couldn’t refresh payment history.</Text><TouchableOpacity accessibilityRole="button" style={styles.more} onPress={load}><Text style={styles.status}>Retry payment history</Text></TouchableOpacity></View> : null}
      {hasLoaded && !error && items.length === 0 ? (
        <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name={completedOnly ? "leaf-outline" : "receipt-outline"} size={28} color="#49704D" /></View><Text style={styles.emptyTitle}>{completedOnly ? 'No completed impact yet' : 'No payments yet'}</Text><Text style={styles.emptyCopy}>{completedOnly ? 'Contributions to completed cleanups will appear here.' : 'Your contributions and unfinished payments will appear here.'}</Text></View>
      ) : null}
      </>}
      renderItem={({ item }) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.line}>
            <Text style={styles.amount}>{formatUsd(item.principal_amount_cents)}</Text>
            <PaymentStatus status={paymentDisplayStatus(item)} />
          </View>
          <Text style={styles.reportTitle} numberOfLines={2}>
            {item.report?.title || 'Litter cleanup report'}
          </Text>
          <Text style={styles.statusMessage}>{statusMessage(item)}</Text>
          <Text style={styles.date}>{formatContributionDate(item.created_at)}</Text>
          <View style={styles.breakdown}><FeeExplanationLabel label="Litterbugs fee" textStyle={styles.muted} /><Text style={styles.muted}>{formatUsd(item.platform_fee_cents)}</Text></View>
          <View style={styles.breakdown}><Text style={styles.total}>{['payment_pending','failed'].includes(item.status) ? 'Payment amount' : item.status === 'refunded' ? 'Original total' : 'Total charged'}</Text><Text style={styles.total}>{formatUsd(item.total_amount_cents)}</Text></View>
          <TouchableOpacity accessibilityRole="button" style={styles.detailsLink} onPress={() => navigation.navigate('PaymentDetail', { contributionId: item.id })}><Text style={styles.status}>View payment details</Text><Ionicons name="chevron-forward" size={16} color="#7A867D" /></TouchableOpacity>
          {item.refunded_at ? <Text style={styles.date}>Refunded {formatContributionDate(item.refunded_at)}</Text> : null}
        </View>
      )}
      ListFooterComponent={<>
      {!hasLoaded && !error ? <View style={styles.waiting} accessibilityRole="progressbar" accessibilityLabel="Loading payment history">
        {showWaiting ? <><ActivityIndicator color="#687178" /><Text style={styles.emptyCopy}>Loading payments…</Text></> : null}
      </View> : null}
      {history.moreError ? <Text style={styles.error}>Couldn’t load older payments. Your current history is still available.</Text> : null}
      {history.nextCursor ? <TouchableOpacity accessibilityRole="button" disabled={loading || history.loadingMore} style={styles.more} onPress={history.loadMore}><Text style={styles.status}>{history.loadingMore ? 'Loading older payments…' : history.moreError ? 'Retry older payments' : 'Load older payments'}</Text></TouchableOpacity> : null}
      </>}
    />
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: 13, backgroundColor: '#F2F5F2', marginBottom: 18 },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, borderRadius: 10 },
  tabSelected: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE7DD' },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EFF5EF', alignItems: 'center', justifyContent: 'center' },
  detailsLink: { minHeight: 44, marginTop: 8, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E7ECE8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waiting: { minHeight: 300, alignItems: 'center', justifyContent: 'center' },
  more: { minHeight: 48, padding: 12, alignItems: 'center', justifyContent: 'center' },
  emptyCopy: { marginTop: 8, color: '#687178', textAlign: 'center', lineHeight: 21 },
  content: { flexGrow: 1, padding: 20, backgroundColor: '#FFFFFF' },
  error: { padding: 16, color: '#A33A32', textAlign: 'center' },
  empty: { minHeight: 280, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 14, color: '#303B34', fontSize: 17, lineHeight: 23, fontWeight: '600' },
  card: { marginBottom: 14, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E2E9E3', backgroundColor: '#FFFFFF' },
  line: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' },
  amount: { color: '#245F2A', fontSize: 22, fontWeight: '600' },
  statusPill: { minHeight: 30, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#EDF5EE' },
  status: { color: '#315F35', fontSize: 12, fontWeight: '600' },
  reportTitle: { marginTop: 11, color: '#30363B', fontSize: 16, lineHeight: 21, fontWeight: '600' },
  statusMessage: { marginTop: 5, color: '#5F696F', fontSize: 13, lineHeight: 18 },
  date: { marginTop: 6, marginBottom: 12, color: '#7A8389', fontSize: 12 },
  breakdown: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  muted: { color: '#6B747A', fontSize: 14 },
  total: { color: '#30363B', fontSize: 14, fontWeight: '600' },
});
