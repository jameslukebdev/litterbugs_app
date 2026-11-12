import { useEffect, useRef } from 'react';
import { Alert, Linking } from 'react-native';
import * as Location from 'expo-location';

import {
  followPhoneForNearbyAlerts,
  loadNotificationPreferences,
  markAskedAboutNearbyAlerts,
  saveNotificationPreferences,
  trackNearbyAlerts,
  wasAskedAboutNearbyAlerts,
} from './notificationPreferences';
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

/** Tell the member when notifications are blocked for Litterbugs on this phone. */
export function explainBlockedNotifications() {
  Alert.alert(
    'Notifications are off',
    'Notifications for Litterbugs are turned off on this phone. Turn them on in Settings to get these alerts.',
    [{ text: 'Not now', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) }],
  );
}

/** Save preference changes after making sure this phone can get notifications. */
export async function saveWithPhoneReady(userId, changes, coordinate = null) {
  const push = await registerCleanupPushDevice().catch(() => ({ status: 'error' }));
  const preferences = await saveNotificationPreferences(userId, changes, coordinate);
  if (push?.status === 'denied') explainBlockedNotifications();
  return preferences;
}

/**
 * On the map: ask once whether the member wants the nearby alerts (only when signed in, with
 * location allowed, and nothing else on screen), and keep the area of alerts that are on with the phone.
 */
export default function useNearbyReportAlerts({ userId, location, canAsk }) {
  const state = useRef({ userId: null, nearbyOn: false, ask: false });
  const asking = useRef(false);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    state.current = { userId, nearbyOn: false, ask: false };
    Promise.all([loadNotificationPreferences(userId), wasAskedAboutNearbyAlerts(userId)])
      .then(([loaded, asked]) => {
        if (!active) return;
        const nearbyOn = loaded.preferences.newLitterNearby || loaded.preferences.cleanupsNearby;
        state.current = { userId, nearbyOn, ask: loaded.available && !loaded.nearbyDecided && !asked };
        if (nearbyOn) trackNearbyAlerts(userId);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [userId]);

  // Alerts that are on follow the phone (the server rounds the spot).
  useEffect(() => {
    if (userId && location && state.current.nearbyOn) followPhoneForNearbyAlerts(userId, location);
  }, [userId, location?.latitude, location?.longitude]);

  useEffect(() => {
    if (!userId || !location || !canAsk || asking.current) return undefined;
    const timer = setTimeout(() => {
      if (!state.current.ask || state.current.userId !== userId || asking.current) return;
      asking.current = true;
      state.current.ask = false;
      markAskedAboutNearbyAlerts(userId);
      Alert.alert(
        'Get alerts about litter near you?',
        'We’ll let you know once a day at 5 pm when new litter is reported within 50 miles, and when a cleanup near you is completed. You can change this anytime in Profile › Notifications.',
        [
          { text: 'Not now', style: 'cancel', onPress: () => {
            // Remember the answer on the account too, so other phones don't ask again.
            saveNotificationPreferences(userId, { newLitterNearby: false, cleanupsNearby: false }).catch(() => {});
          } },
          { text: 'Turn on', onPress: () => {
            saveWithPhoneReady(userId, { newLitterNearby: true, cleanupsNearby: true }, location)
              .then(() => { state.current.nearbyOn = true; })
              .catch(() => Alert.alert('Couldn’t turn on the alerts', 'Check your connection and try again in Profile › Notifications.'));
          } },
        ],
      );
    }, ASK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [userId, Boolean(location), canAsk]);
}
