import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, Text, View } from 'react-native';

import { loadNearbyReportAlerts, setNearbyReportAlerts, trackEnabledNearbyAlert } from '../lib/nearbyReportAlerts';
import { phoneCoordinateForAlerts, turnOnNearbyAlerts } from '../lib/useNearbyReportAlerts';
import { colors } from '../lib/theme';

// Settings switch for the daily "New litter near you" alert. Hidden until the server supports it.
export default function NearbyAlertSetting({ userId, style }) {
  const [state, setState] = useState({ available: false, enabled: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    loadNearbyReportAlerts(userId)
      .then(alerts => { if (active) setState(alerts); })
      .catch(() => {});
    return () => { active = false; };
  }, [userId]);

  const change = async (enabled) => {
    setBusy(true);
    setState(current => ({ ...current, enabled }));
    try {
      if (enabled) {
        const coordinate = await phoneCoordinateForAlerts({ request: true });
        if (!coordinate) {
          setState(current => ({ ...current, enabled: false }));
          Alert.alert(
            'Location needed',
            'Litterbugs uses your rough location to find litter reported near you. Allow location for Litterbugs in Settings to turn on this alert.',
            [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) }],
          );
          return;
        }
        await turnOnNearbyAlerts(userId, coordinate);
        trackEnabledNearbyAlert(userId);
      } else {
        await setNearbyReportAlerts(userId, { enabled: false });
      }
    } catch {
      setState(current => ({ ...current, enabled: !enabled }));
      Alert.alert('Couldn’t change the alert', 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!state.available) return null;
  return (
    <View style={[styles.group, style]}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.label}>New litter near you</Text>
          <Text style={styles.caption}>A daily alert at 5 pm when litter is reported within 50 miles.</Text>
        </View>
        <Switch
          value={state.enabled}
          onValueChange={change}
          disabled={busy}
          trackColor={{ false: colors.line, true: colors.primary }}
          accessibilityLabel="Daily alert for new litter near you"
          accessibilityHint="Once a day at 5 pm, when litter is reported within 50 miles of you"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginHorizontal: 20, borderRadius: 18, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', backgroundColor: colors.white },
  row: { minHeight: 64, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  copy: { flex: 1, gap: 3 },
  label: { color: colors.ink, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});
