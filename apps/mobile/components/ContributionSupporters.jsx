import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import useFocusedResource from '../lib/useFocusedResource';
import { donationTimeAgo, loadContributorCredit } from '../lib/contributorCredit';
import { formatUsd } from '../lib/funding';
import { colors } from '../lib/theme';
import PrivateView from './PrivateView';

export function ContributionSupporterCredit({ credit, now = Date.now(), style }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setExpanded(false); }, [credit?.report_id]);
  const donations = credit?.donations ?? [];
  if (!donations.length) return null;
  const visible = expanded ? donations : donations.slice(0, 3);
  return <PrivateView style={[styles.panel, style]} testID="cleanup-funders">
    {visible.map((donation, index) => {
      const name = donation.name || 'Anonymous';
      return <View key={`${donation.donatedAt}-${index}`} style={styles.donation}>
        <View style={styles.avatar} accessible={false} importantForAccessibility="no-hide-descendants">
          <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>
            <Text style={styles.amount}>{formatUsd(donation.amountCents)}</Text>
            {donation.donatedAt ? ` · ${donationTimeAgo(donation.donatedAt, now)}` : ''}
          </Text>
        </View>
      </View>;
    })}
    {donations.length > 3 ? <TouchableOpacity
      style={styles.more} onPress={() => setExpanded(value => !value)}
      accessibilityRole="button" accessibilityState={{ expanded }}
    ><Text style={styles.moreText}>{expanded ? 'Show fewer donations' : `See all ${donations.length} donations`}</Text></TouchableOpacity> : null}
  </PrivateView>;
}

export default function ContributionSupporters({ reportId, visible, style }) {
  const resource = useFocusedResource(useCallback(() => loadContributorCredit(reportId), [reportId]), { enabled: Boolean(visible && reportId) });
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!visible) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [visible, reportId]);
  // No stale donor panel after a failed refresh: a donor may have hidden a name.
  if (!visible || resource.error || resource.data?.report_id !== reportId) return null;
  return <ContributionSupporterCredit credit={resource.data} now={now} style={style} />;
}

const styles = StyleSheet.create({
  panel: { marginTop: 12, marginBottom: 16, padding: 14, borderWidth: 1, borderColor: '#f0dfa2', borderRadius: 14, backgroundColor: '#fffbef', gap: 13 },
  donation: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 35, height: 35, borderRadius: 18, borderWidth: 1, borderColor: '#f0dfa2', backgroundColor: '#fff3c9', alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#875b0b', fontSize: 14, fontWeight: '800' },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  name: { color: colors.ink, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  meta: { color: '#706957', fontSize: 12, lineHeight: 18 },
  amount: { color: '#5f471a', fontWeight: '800' },
  more: { minHeight: 44, padding: 10, borderWidth: 1, borderColor: '#ebd68d', borderRadius: 9, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  moreText: { color: '#79500b', fontSize: 13, fontWeight: '700' },
});
