import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LoadingBee from './components/LoadingBee';
import { LoadFailure } from './components/ui';
import { DEFAULT_NOTIFICATION_PREFERENCES, loadNotificationPreferences, saveNotificationPreferences, trackNearbyAlerts } from './lib/notificationPreferences';
import { useSession } from './lib/session';
import { colors } from './lib/theme';
import { phoneCoordinateForAlerts, saveWithPhoneReady } from './lib/useNearbyReportAlerts';

// Profile › Notifications: which updates reach this phone. Everything still appears in Updates.
const GROUPS = [
  {
    title: 'Your activity',
    rows: [
      { key: 'reportsAndCleanups', label: 'Your reports & cleanups', caption: 'Claims, reviews and approvals for your reports and cleanups.' },
      { key: 'payments', label: 'Payments', caption: 'Contributions, rewards, refunds and payouts.' },
    ],
  },
  {
    title: 'Near you',
    rows: [
      { key: 'newLitterNearby', label: 'New litter near you', caption: 'Once a day at 5 pm, when litter is reported within 50 miles.', nearby: true },
      { key: 'cleanupsNearby', label: 'Cleanups completed near you', caption: 'When a cleanup within 50 miles is completed.', nearby: true },
    ],
  },
];

function SettingRow({ label, caption, value, onChange, disabled, divided }) {
  return (
    <View style={[styles.row, divided && styles.divided]}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.caption}>{caption}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.line, true: colors.primary }}
        accessibilityLabel={label}
        accessibilityHint={caption}
      />
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const { user } = useSession();
  const insets = useSafeAreaInsets();
  const [loaded, setLoaded] = useState(null);
  const [error, setError] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [phoneBlocked, setPhoneBlocked] = useState(false);

  const load = useCallback(() => {
    setError(false);
    loadNotificationPreferences(user?.id).then(setLoaded).catch(() => setError(true));
  }, [user?.id]);
  useEffect(load, [load]);

  // Whether this phone lets Litterbugs show notifications at all (checked again on return from Settings).
  useEffect(() => {
    const check = () => Notifications.getPermissionsAsync().then(p => setPhoneBlocked(p.status === 'denied')).catch(() => {});
    check();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') check(); });
    return () => subscription.remove();
  }, []);

  const preferences = loaded?.preferences ?? DEFAULT_NOTIFICATION_PREFERENCES;

  const change = async (row, value) => {
    const previous = preferences;
    setBusyKey(row.key);
    setLoaded(current => ({ ...current, preferences: { ...current.preferences, [row.key]: value } }));
    try {
      let next;
      if (value && row.nearby) {
        const coordinate = await phoneCoordinateForAlerts({ request: true });
        if (!coordinate) {
          setLoaded(current => ({ ...current, preferences: previous }));
          Alert.alert(
            'Location needed',
            'Alerts near you use your rough location to find litter and cleanups nearby. Allow location for Litterbugs in Settings to turn them on.',
            [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) }],
          );
          return;
        }
        next = await saveWithPhoneReady(user.id, { [row.key]: true }, coordinate);
        trackNearbyAlerts(user.id);
      } else if (value) {
        next = await saveWithPhoneReady(user.id, { [row.key]: true });
      } else {
        next = await saveNotificationPreferences(user.id, { [row.key]: false });
      }
      setLoaded(current => ({ ...current, preferences: next }));
    } catch {
      setLoaded(current => ({ ...current, preferences: previous }));
      Alert.alert('Couldn’t change this setting', 'Check your connection and try again.');
    } finally {
      setBusyKey(null);
    }
  };

  if (error) {
    return <View style={styles.screen}><LoadFailure title="Couldn’t load notification settings" onRetry={load} /></View>;
  }
  if (!loaded) return <View style={styles.screen}><LoadingBee label="Loading notification settings" /></View>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}>
      {phoneBlocked ? (
        <TouchableOpacity style={styles.blocked} onPress={() => Linking.openSettings().catch(() => {})} accessibilityRole="button" activeOpacity={0.8}>
          <Ionicons name="notifications-off-outline" size={20} color={colors.primaryDark} />
          <View style={styles.copy}>
            <Text style={styles.blockedTitle}>Notifications are off on this phone</Text>
            <Text style={styles.caption}>Turn them on for Litterbugs in Settings to get any of these.</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.subtle} />
        </TouchableOpacity>
      ) : null}
      {GROUPS.map(group => (
        <View key={group.title}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <View style={styles.group}>
            {group.rows.map((row, index) => (
              <SettingRow
                key={row.key}
                label={row.label}
                caption={row.caption}
                value={Boolean(preferences[row.key])}
                onChange={value => change(row, value)}
                disabled={busyKey !== null}
                divided={index < group.rows.length - 1}
              />
            ))}
          </View>
        </View>
      ))}
      <Text style={styles.footnote}>
        Everything still appears in Updates. These switches decide what is also sent to this phone. Alerts near you use your rough location (to about a mile) only while they’re on.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  groupTitle: { marginTop: 20, marginBottom: 8, marginLeft: 4, color: colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  group: { borderRadius: 18, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', backgroundColor: colors.white },
  row: { minHeight: 64, paddingHorizontal: 18, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 14 },
  divided: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  copy: { flex: 1, gap: 3 },
  label: { color: colors.ink, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  blocked: { marginTop: 12, padding: 16, borderRadius: 18, backgroundColor: colors.primarySoft ?? '#F1EFFD', flexDirection: 'row', alignItems: 'center', gap: 12 },
  blockedTitle: { color: colors.ink, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  footnote: { marginTop: 18, marginHorizontal: 4, color: colors.muted, fontSize: 13, lineHeight: 19 },
});
