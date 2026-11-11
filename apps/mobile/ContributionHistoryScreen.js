import FeeExplanationLabel from './components/FeeExplanationLabel';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useFocusedResource from './lib/useFocusedResource';
import { useSession } from './lib/session';
import { statusMessage, paymentDisplayStatus, formatContributionDate } from './lib/contributionPresentation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatUsd, loadMyContributions } from './lib/funding';
import PaymentStatus from './components/PaymentStatus';
import { EmptyState, ErrorText, PillTabs, PullRefresh, TextLink } from './components/ui';
import LoadingBee from './components/LoadingBee';
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
      refreshControl={<PullRefresh refreshing={pullRefreshing} onRefresh={async () => { setPullRefreshing(true); await load(); setPullRefreshing(false); }} />}
      data={items}
      keyExtractor={item => item.id}
      ListHeaderComponent={<>
      <PillTabs style={styles.tabs} value={completedOnly ? 'completed' : 'all'} onChange={value => setCompletedOnly(value === 'completed')} options={[['all', 'All payments'], ['completed', 'Completed impact']]} />
      {error ? <View><ErrorText style={styles.error}>Couldn’t refresh payment history.</ErrorText><TextLink label="Retry payment history" onPress={load} /></View> : null}
      {hasLoaded && !error && items.length === 0 ? (
        <EmptyState style={styles.empty} bug={completedOnly ? 'flower' : 'bee'} title={completedOnly ? 'No completed impact yet' : 'No payments yet'} text={completedOnly ? 'Contributions to completed cleanups will appear here.' : 'Your contributions and unfinished payments will appear here.'} />
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
        {showWaiting ? <LoadingBee label="Loading payment history" message="Loading payments…" /> : null}
      </View> : null}
      {history.moreError ? <ErrorText style={styles.error}>Couldn’t load older payments. Your current history is still available.</ErrorText> : null}
      {history.nextCursor ? <TextLink disabled={loading || history.loadingMore} onPress={history.loadMore} label={history.loadingMore ? 'Loading older payments…' : history.moreError ? 'Retry older payments' : 'Load older payments'} /> : null}
      </>}
    />
  );
}

const styles = StyleSheet.create({
  tabs: { marginBottom: 18 },
  detailsLink: { minHeight: 44, marginTop: 8, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waiting: { minHeight: 300, alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, padding: 20, backgroundColor: colors.white },
  error: { padding: 16, textAlign: 'center' },
  empty: { minHeight: 280 },
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
