import { userMessage } from './lib/userMessage';
import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useFocusedResource from './lib/useFocusedResource';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { closeExpiredReport, formatUsd, loadMyExpiredReports, renewExpiredReport } from './lib/funding';
import { useReports } from './lib/reports';
import { useSession } from './lib/session';
import BrandedLoadingState, { LoadingButtonContent } from './BrandedLoadingState';

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
    'The report will end and every available contribution will be fully refunded, including the 10% fee.',
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
      style={{ backgroundColor: '#FFFFFF' }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#2F7D32" />}
    >
      <Text style={styles.title}>Renew or close reports</Text>
      <View style={styles.explanation}><Ionicons name="calendar-outline" size={20} color="#49704D" /><Text style={styles.subtitle}>Expired reports stay here for 7 days. Renewing starts a fresh 30-day period and keeps the cleanup fund attached.</Text></View>
      {loading && reports.length === 0 ? (
        <BrandedLoadingState compact title="Checking expired reports…" message="Looking for reports that need your decision." />
      ) : null}
      {error ? <TouchableOpacity accessibilityRole="button" onPress={load} style={styles.closeButton}><Text>Couldn’t load reports. Tap to retry.</Text></TouchableOpacity> : null}
      {!loading && !error && reports.length === 0 ? (
        <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="checkmark-circle-outline" size={28} color="#49704D" /></View><Text style={styles.emptyTitle}>Nothing needs a decision</Text><Text style={styles.emptyText}>Reports that need renewal will appear here.</Text></View>
      ) : reports.map((report) => (
        <View key={report.id} style={styles.card}>
          <Text style={styles.reportTitle}>{report.title || 'Litter report'}</Text>
          <Text style={styles.meta}>Cleanup reward: {formatUsd(report.funded_amount_cents)}</Text>
          <Text style={styles.meta}>Decide by {new Date(report.renewal_decision_due_at).toLocaleString()}</Text>
          <TouchableOpacity style={styles.renewButton} onPress={() => renew(report)} disabled={Boolean(busyId)}>
            {busyId === report.id ? <LoadingButtonContent label="Renewing…" /> : <Text style={styles.renewText}>Renew for 30 days</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={() => close(report)} disabled={Boolean(busyId)}>
            {busyId === report.id ? <LoadingButtonContent label="Updating…" color="#A33A32" /> : <Text style={styles.closeText}>Close and refund</Text>}
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 20, backgroundColor: '#FFFFFF' },
  title: { color: '#26332B', fontSize: 24, lineHeight: 30, fontWeight: '600' },
  explanation: { marginTop: 14, padding: 14, borderRadius: 13, backgroundColor: '#F4F8F4', flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  subtitle: { flex: 1, color: '#637167', fontSize: 14, lineHeight: 21 },
  empty: { minHeight: 240, marginTop: 24, padding: 20, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EFF5EF', alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 7, color: '#6D7970', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  emptyTitle: { marginTop: 14, color: '#303B34', fontSize: 17, lineHeight: 23, fontWeight: '600' },
  card: { marginTop: 17, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: '#E0E8E1', backgroundColor: '#FFFFFF' },
  reportTitle: { color: '#30363B', fontSize: 17, lineHeight: 23, fontWeight: '600' },
  meta: { marginTop: 7, color: '#667078', fontSize: 14 },
  renewButton: { minHeight: 48, marginTop: 17, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#2F7D32' },
  renewText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  closeButton: { minHeight: 46, marginTop: 9, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#A33A32', fontSize: 15, fontWeight: '600' },
});
