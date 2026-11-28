import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { analyticsCollectionEnabled, setAnalyticsCollectionEnabled } from '../lib/analytics';
import { TextLink } from './ui';
import { colors } from '../lib/theme';

export default function AnalyticsChoice() {
  const [enabled, setEnabled] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const load = () => {
    setFailed(false);
    analyticsCollectionEnabled().then(setEnabled).catch(() => setFailed(true));
  };
  useEffect(load, []);
  const change = async value => {
    setBusy(true);
    try { await setAnalyticsCollectionEnabled(value); setEnabled(value); }
    catch {
      // Turning off fails closed for this session, even if storage failed.
      if (!value) setEnabled(false);
      Alert.alert('Couldn’t save this choice', 'Try again before closing the app.');
    } finally { setBusy(false); }
  };
  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.label}>App analytics and diagnostics</Text>
          <Text style={styles.caption}>Help improve Litterbugs with usage information, crash reports and masked recordings. This choice applies to this device, including when you’re signed out.</Text>
        </View>
        <Switch value={enabled === true} disabled={enabled === null || busy || failed} onValueChange={change}
          accessibilityLabel="App analytics and diagnostics" trackColor={{ false: colors.line, true: '#b9e9dd' }} thumbColor={colors.white} />
      </View>
      {failed ? <TextLink label="Couldn’t load your choice. Try again" onPress={load} /> : null}
      <Text style={styles.note}>Turn this off before staff testing. It stops future app analytics on this device. Information already sent is not deleted.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1 },
  label: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: colors.ink },
  caption: { fontSize: 14, lineHeight: 22, color: colors.muted, marginTop: 6 },
  note: { fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 16 },
});
