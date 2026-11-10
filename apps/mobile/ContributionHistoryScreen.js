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
import BrandBug from './components/BrandBug';
import { colors, fonts } from './lib/theme';

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
      style={{ backgroundColor: colors.white }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
      refreshControl={<RefreshControl refreshing={pullRefreshing} onRefresh={async () => { setPullRefreshing(true); await load(); setPullRefreshing(false); }} tintColor={colors.primary} />}
      data={items}
      keyExtractor={item => item.id}
      ListHeaderComponent={<>
      <View style={styles.tabs}>{[[false,'All payments'],[true,'Completed impact']].map(([value,label]) => <TouchableOpacity key={label} accessibilityRole="tab" accessibilityState={{selected:completedOnly===value}} onPress={() => setCompletedOnly(value)} style={[styles.tab, completedOnly === value && styles.tabSelected]}><Text style={[styles.tabText, completedOnly === value && styles.tabTextSelected]}>{label}</Text></TouchableOpacity>)}</View>
      {error ? <View><Text style={styles.error}>Couldn’t refresh payment history.</Text><TouchableOpacity accessibilityRole="button" style={styles.more} onPress={load}><Text style={styles.status}>Retry payment history</Text></TouchableOpacity></View> : null}
      {hasLoaded && !error && items.length === 0 ? (
        <View style={styles.empty}><BrandBug kind={completedOnly ? 'flower' : 'bee'} size={36} /><Text style={styles.emptyTitle}>{completedOnly ? 'No completed impact yet' : 'No payments yet'}</Text><Text style={styles.emptyCopy}>{completedOnly ? 'Contributions to completed cleanups will appear here.' : 'Your contributions and unfinished payments will appear here.'}</Text></View>
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
          <View style={styles.breakdown}><FeeExplanationLabel label="Service fee" textStyle={styles.muted} /><Text style={styles.muted}>{formatUsd(item.platform_fee_cents)}</Text></View>
          <View style={styles.breakdown}><Text style={styles.total}>{['payment_pending','failed'].includes(item.status) ? 'Payment amount' : item.status === 'refunded' ? 'Original total' : 'Total charged'}</Text><Text style={styles.total}>{formatUsd(item.total_amount_cents)}</Text></View>
          <TouchableOpacity accessibilityRole="button" style={styles.detailsLink} onPress={() => navigation.navigate('PaymentDetail', { contributionId: item.id })}><Text style={styles.status}>View payment details</Text><Ionicons name="chevron-forward" size={16} color={colors.muted} /></TouchableOpacity>
          {item.refunded_at ? <Text style={styles.date}>Refunded {formatContributionDate(item.refunded_at)}</Text> : null}
        </View>
      )}
      ListFooterComponent={<>
      {!hasLoaded && !error ? <View style={styles.waiting} accessibilityRole="progressbar" accessibilityLabel="Loading payment history">
        {showWaiting ? <><ActivityIndicator color={colors.muted} /><Text style={styles.emptyCopy}>Loading payments…</Text></> : null}
      </View> : null}
      {history.moreError ? <Text style={styles.error}>Couldn’t load older payments. Your current history is still available.</Text> : null}
      {history.nextCursor ? <TouchableOpacity accessibilityRole="button" disabled={loading || history.loadingMore} style={styles.more} onPress={history.loadMore}><Text style={styles.status}>{history.loadingMore ? 'Loading older payments…' : history.moreError ? 'Retry older payments' : 'Load older payments'}</Text></TouchableOpacity> : null}
      </>}
    />
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  tab: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, borderRadius: 22, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white },
  tabText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  tabTextSelected: { color: colors.primaryDark, fontWeight: '800' },
  tabSelected: { borderWidth: 2, borderColor: colors.primary },
  detailsLink: { minHeight: 44, marginTop: 8, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waiting: { minHeight: 300, alignItems: 'center', justifyContent: 'center' },
  more: { minHeight: 48, padding: 12, alignItems: 'center', justifyContent: 'center' },
  emptyCopy: { marginTop: 8, color: colors.muted, textAlign: 'center', lineHeight: 21 },
  content: { flexGrow: 1, padding: 20, backgroundColor: colors.white },
  error: { padding: 16, color: '#A33A32', textAlign: 'center' },
  empty: { minHeight: 280, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 12, color: colors.ink, fontSize: 17, lineHeight: 23, fontFamily: fonts.heading },
  card: { marginBottom: 14, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  line: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' },
  amount: { color: colors.ink, fontSize: 22, fontFamily: fonts.heading },
  status: { color: colors.primaryDark, fontSize: 12, fontWeight: '600' },
  reportTitle: { marginTop: 10, color: colors.ink, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  statusMessage: { marginTop: 5, color: colors.muted, fontSize: 13, lineHeight: 18 },
  date: { marginTop: 6, marginBottom: 12, color: colors.muted, fontSize: 12 },
  breakdown: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  muted: { color: colors.muted, fontSize: 14 },
  total: { color: colors.ink, fontSize: 14, fontWeight: '600' },
});
