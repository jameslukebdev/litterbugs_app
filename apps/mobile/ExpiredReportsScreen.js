import { userMessage } from './lib/userMessage';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useFocusedResource from './lib/useFocusedResource';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { closeExpiredReport, formatUsd, loadMyExpiredReports, renewExpiredReport } from './lib/funding';
import { useReports } from './lib/reports';
import { useSession } from './lib/session';
import LoadingBee from './components/LoadingBee';
import { EmptyState, PrimaryButton, TextLink } from './components/ui';
import { colors, fonts } from './lib/theme';

export default function ExpiredReportsScreen() {
  const { user } = useSession();
  const { refreshReports } = useReports();
  const insets = useSafeAreaInsets();
  const [busyId, setBusyId] = useState(null);
  const resource = useFocusedResource(useCallback(() => loadMyExpiredReports(user.id), [user?.id]), { enabled: Boolean(user?.id) });
  const { loading, error, refresh: load } = resource;
  const reports = resource.data ?? [];

  const renew = async (report) => {
    try {
      setBusyId(report.id);
      await renewExpiredReport(report.id);
      await Promise.all([load(), refreshReports({ showRefresh: false })]);
    } catch (error) {
      Alert.alert('Couldn’t renew report', userMessage(error, 'This report may have changed. Refresh and try again.'));
    } finally { setBusyId(null); }
  };

  const close = (report) => Alert.alert(
    'Close this report?',
    'The report will end and every available contribution will be fully refunded, including the service fee.',
    [
      { text: 'Keep report', style: 'cancel' },
      {
        text: 'Close and refund',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusyId(report.id);
            await closeExpiredReport(report.id);
            await Promise.all([load(), refreshReports({ showRefresh: false })]);
          } catch (error) {
            Alert.alert('Couldn’t close report', userMessage(error, 'This report may have changed. Refresh and try again.'));
          } finally { setBusyId(null); }
        },
      },
    ]
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.white }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
    >
      <Text style={styles.title}>Renew or close reports</Text>
      <View style={styles.explanation}><Ionicons name="calendar-outline" size={20} color={colors.muted} /><Text style={styles.subtitle}>Expired reports stay here for 7 days. Renewing starts a fresh 30-day period and keeps the cleanup fund attached.</Text></View>
      {loading && reports.length === 0 ? (
        <LoadingBee label="Checking expired reports" />
      ) : null}
      {error ? <TextLink label="Couldn’t load reports. Tap to retry." onPress={load} style={styles.closeButton} /> : null}
      {!loading && !error && reports.length === 0 ? (
        <EmptyState bug="flower" title="Nothing needs a decision" text="Reports that need renewal will appear here." style={styles.empty} />
      ) : reports.map((report) => (
        <View key={report.id} style={styles.card}>
          <Text style={styles.reportTitle}>{report.title || 'Litter report'}</Text>
          <Text style={styles.meta}>Cleanup reward: {formatUsd(report.funded_amount_cents)}</Text>
          <Text style={styles.meta}>Decide by {new Date(report.renewal_decision_due_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
          <PrimaryButton label="Renew for 30 days" busyLabel="Updating report…" busy={busyId === report.id} disabled={Boolean(busyId)} onPress={() => renew(report)} style={styles.renewButton} />
          <TextLink tone="danger" label="Close and refund" disabled={Boolean(busyId)} onPress={() => close(report)} style={styles.closeButton} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 20, backgroundColor: colors.white },
  title: { color: colors.ink, fontSize: 24, lineHeight: 30, fontFamily: fonts.heading },
  explanation: { marginTop: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },

  subtitle: { flex: 1, color: colors.muted, fontSize: 14, lineHeight: 21 },
  empty: { minHeight: 240, marginTop: 24 },
  card: { marginTop: 17, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  reportTitle: { color: colors.ink, fontSize: 17, lineHeight: 23, fontWeight: '600' },
  meta: { marginTop: 7, color: colors.muted, fontSize: 14 },
  renewButton: { minHeight: 48, marginTop: 17 },
  closeButton: { marginTop: 9 },
});
