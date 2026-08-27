import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { closeExpiredReport, formatUsd, loadMyExpiredReports, renewExpiredReport } from './lib/funding';
import { useReports } from './lib/reports';
import { useSession } from './lib/session';

export default function ExpiredReportsScreen() {
  const { user } = useSession();
  const { refreshReports } = useReports();
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      setReports(await loadMyExpiredReports(user.id));
    } catch {
      Alert.alert('Couldn’t load expired reports', 'Pull down to try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renew = async (report) => {
    try {
      setBusyId(report.id);
      await renewExpiredReport(report.id);
      await Promise.all([load(), refreshReports({ showRefresh: false })]);
    } catch (error) {
      Alert.alert('Couldn’t renew report', error.message || 'Please try again.');
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
            Alert.alert('Couldn’t close report', error.message || 'Please try again.');
          } finally { setBusyId(null); }
        },
      },
    ]
  );

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#2F7D32" />}
    >
      <Text style={styles.title}>Renew or close reports</Text>
      <Text style={styles.subtitle}>Expired reports stay here for 7 days. Renewing starts a fresh 30-day period and keeps the cleanup fund attached.</Text>
      {!loading && reports.length === 0 ? (
        <View style={styles.empty}><Ionicons name="checkmark-circle-outline" size={38} color="#6D777D" /><Text style={styles.emptyTitle}>Nothing needs a decision</Text></View>
      ) : reports.map((report) => (
        <View key={report.id} style={styles.card}>
          <Text style={styles.reportTitle}>{report.title || 'Litter report'}</Text>
          <Text style={styles.meta}>Cleanup reward: {formatUsd(report.funded_amount_cents)}</Text>
          <Text style={styles.meta}>Decide by {new Date(report.renewal_decision_due_at).toLocaleString()}</Text>
          <TouchableOpacity style={styles.renewButton} onPress={() => renew(report)} disabled={busyId === report.id}>
            {busyId === report.id ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.renewText}>Renew for 30 days</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={() => close(report)} disabled={busyId === report.id}>
            <Text style={styles.closeText}>Close and refund</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 20, backgroundColor: '#F5F6F7' },
  title: { color: '#202428', fontSize: 27, fontWeight: '900' },
  subtitle: { marginTop: 8, color: '#667078', fontSize: 15, lineHeight: 22 },
  empty: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 12, color: '#59636A', fontSize: 17, fontWeight: '800' },
  card: { marginTop: 17, padding: 18, borderRadius: 17, backgroundColor: '#FFFFFF' },
  reportTitle: { color: '#30363B', fontSize: 18, fontWeight: '900' },
  meta: { marginTop: 7, color: '#667078', fontSize: 14 },
  renewButton: { minHeight: 48, marginTop: 17, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#2F7D32' },
  renewText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  closeButton: { minHeight: 46, marginTop: 9, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#A33A32', fontSize: 15, fontWeight: '800' },
});
