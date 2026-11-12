import { useEffect, useRef } from 'react';
import { Alert, Linking } from 'react-native';
import * as Location from 'expo-location';

import {
  followPhoneForNearbyAlerts,
  loadNearbyReportAlerts,
  markAskedAboutNearbyAlerts,
  setNearbyReportAlerts,
  trackEnabledNearbyAlert,
  wasAskedAboutNearbyAlerts,
} from './nearbyReportAlerts';
import { registerCleanupPushDevice } from './pushNotifications';

const ASK_DELAY_MS = 2500; // let the map settle and the pins land before asking

/** The phone's location for the alert area, asking for permission only when `request` is set. */
export async function phoneCoordinateForAlerts({ request = false } = {}) {
  let permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted && request && permission.canAskAgain !== false) permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return null;
  const position = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60 * 1000 })
    ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return position ? { latitude: position.coords.latitude, longitude: position.coords.longitude } : null;
}

/** Turn the alert on: make sure this phone can get notifications, then save the area. */
export async function turnOnNearbyAlerts(userId, coordinate) {
  const push = await registerCleanupPushDevice().catch(() => ({ status: 'error' }));
  await setNearbyReportAlerts(userId, { enabled: true, coordinate });
  if (push?.status === 'denied') {
    Alert.alert(
      'Notifications are off',
      'Your alert is on, but notifications for Litterbugs are turned off on this phone. Turn them on in Settings to get it.',
      [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) }],
    );
  }
}

/**
 * On the map: ask once whether the member wants the daily alert (only when signed in, with
 * location allowed, and nothing else on screen), and keep an alert that is on following the phone.
 */
export default function useNearbyReportAlerts({ userId, location, canAsk }) {
  const state = useRef({ userId: null, available: false, enabled: false, ask: false });
  const asking = useRef(false);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    state.current = { userId, available: false, enabled: false, ask: false };
    Promise.all([loadNearbyReportAlerts(userId), wasAskedAboutNearbyAlerts(userId)])
      .then(([alerts, asked]) => {
        if (!active) return;
        state.current = { userId, available: alerts.available, enabled: alerts.enabled, ask: alerts.available && !alerts.decided && !asked };
        if (alerts.enabled) trackEnabledNearbyAlert(userId);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [userId]);

  // An alert that is on follows the phone (the server rounds the spot).
  useEffect(() => {
    if (userId && location && state.current.enabled) followPhoneForNearbyAlerts(userId, location);
  }, [userId, location?.latitude, location?.longitude]);

  useEffect(() => {
    if (!userId || !location || !canAsk || asking.current) return undefined;
    const timer = setTimeout(() => {
      if (!state.current.ask || state.current.userId !== userId || asking.current) return;
      asking.current = true;
      state.current.ask = false;
      markAskedAboutNearbyAlerts(userId);
      Alert.alert(
        'Get a daily alert for new litter near you?',
        'Once a day at 5 pm, if new litter is reported within 50 miles of you, we’ll let you know so you can help fund or clean it up. You can turn this off anytime in Settings.',
        [
          { text: 'Not now', style: 'cancel', onPress: () => {
            // Remember the answer on the account too, so other phones don't ask again.
            setNearbyReportAlerts(userId, { enabled: false }).catch(() => {});
          } },
          { text: 'Turn on', onPress: () => {
            turnOnNearbyAlerts(userId, location)
              .then(() => { state.current.enabled = true; })
              .catch(() => Alert.alert('Couldn’t turn on the alert', 'Check your connection and try again in Settings.'));
          } },
        ],
      );
    }, ASK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [userId, Boolean(location), canAsk]);
}
