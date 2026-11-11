import { userMessage } from './lib/userMessage';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import useFocusedResource from './lib/useFocusedResource';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { closeExpiredReport, formatUsd, loadMyExpiredReports, renewExpiredReport } from './lib/funding';
import { useReports } from './lib/reports';
import { useSession } from './lib/session';
import LoadingBee from './components/LoadingBee';
import { showFlowDone } from './components/FlowDone';
import RemotePhoto from './components/RemotePhoto';
import BrandBug from './components/BrandBug';
import { EmptyState, PrimaryButton, PullRefresh, TextLink } from './components/ui';
import { colors, fonts } from './lib/theme';

export default function ExpiredReportsScreen() {
  const { user } = useSession();
  const { refreshReports, getReportPhotoUrl } = useReports();
  const insets = useSafeAreaInsets();
  const [busyId, setBusyId] = useState(null);
  const resource = useFocusedResource(useCallback(() => loadMyExpiredReports(user.id), [user?.id]), { enabled: Boolean(user?.id) });
  const { loading, error, refresh: load } = resource;
  const reports = resource.data ?? [];

  const renew = async (report) => {
    try {
      setBusyId(report.id);
      await renewExpiredReport(report.id);
      showFlowDone({ bug: 'dragonfly', title: 'Report renewed', text: Number(report.funded_amount_cents) > 0 ? 'Renewed for 30 days with its cleanup fund preserved.' : 'Renewed for 30 days.' });
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
            showFlowDone({ bug: 'dragonfly', title: 'Report closed', text: Number(report.funded_amount_cents) > 0 ? 'Everyone who chipped in is being refunded.' : '' });
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
      refreshControl={<PullRefresh refreshing={loading && reports.length > 0} onRefresh={load} />}
    >
      {loading && reports.length === 0 ? (
        <LoadingBee label="Checking expired reports" />
      ) : null}
      {error ? <TextLink label="Couldn’t load reports. Tap to retry." onPress={load} style={styles.closeButton} /> : null}
      {!loading && !error && reports.length === 0 ? (
        <EmptyState bug="flower" title="Nothing needs a decision" text="Reports that need renewal will appear here." style={styles.empty} />
      ) : reports.map((report) => (
        // Website renewal card: the question, the report, its fund, the deadline, two choices.
        <View key={report.id} style={styles.card}>
          <Text style={styles.cardHeading}>Keep this report open?</Text>
          <View style={styles.reportRow}>
            <RemotePhoto path={report.photo_paths?.[0]} getUrl={getReportPhotoUrl} label={`Photo for ${report.title || 'litter report'}`} style={styles.photo} />
            <View style={{ flex: 1 }}>
              <Text style={styles.reportTitle}>{report.title || 'Litter report'}</Text>
              {Number(report.funded_amount_cents) > 0 ? (
                <View style={styles.fundRow}>
                  <BrandBug kind="bee" size={16} />
                  <Text style={styles.fundText}>{formatUsd(report.funded_amount_cents)} in its cleanup fund</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Text style={styles.meta}>
            Decide by <Text style={styles.due}>{new Date(report.renewal_decision_due_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>. If you don’t, it closes{Number(report.funded_amount_cents) > 0 ? ' and everyone who chipped in is refunded' : ''}.
          </Text>
          <View style={styles.choices}>
            <PrimaryButton label="Renew 30 days" busyLabel="Updating report…" busy={busyId === report.id} disabled={Boolean(busyId)} onPress={() => renew(report)} style={styles.choice} />
            <TouchableOpacity style={[styles.choice, styles.closeChoice, Boolean(busyId) && { opacity: 0.6 }]} disabled={Boolean(busyId)} onPress={() => close(report)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={Number(report.funded_amount_cents) > 0 ? 'Close and refund' : 'Close report'}>
              <Text style={styles.closeChoiceText}>{Number(report.funded_amount_cents) > 0 ? 'Close and refund' : 'Close report'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 20, backgroundColor: colors.white },
  empty: { minHeight: 240, marginTop: 24 },
  card: { marginBottom: 16, padding: 18, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  cardHeading: { color: colors.ink, fontSize: 17, lineHeight: 23, fontFamily: fonts.heading },
  reportRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  photo: { width: 64, height: 64, borderRadius: 12 },
  reportTitle: { color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  fundRow: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 6 },
  fundText: { color: colors.yellow, fontSize: 14, fontWeight: '800' },
  meta: { marginTop: 12, color: colors.body, fontSize: 14, lineHeight: 21 },
  due: { color: colors.yellow, fontWeight: '800' },
  choices: { marginTop: 14, flexDirection: 'row', gap: 10 },
  choice: { flex: 1, minHeight: 48, paddingHorizontal: 8 },
  closeChoice: { alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderBottomWidth: 3, borderColor: colors.redBorder, backgroundColor: colors.white },
  closeChoiceText: { color: colors.red, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  closeButton: { marginTop: 9 },
});
