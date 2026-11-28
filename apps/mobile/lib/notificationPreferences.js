import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import { distanceMiles } from './reportFilters';
import { supabase } from './supabase';

// What reaches a member's phone (supabase/migrations/*_notification_preferences_and_nearby_alerts.sql).
// Everything still appears in Updates. The two nearby alerts are off until the member turns them on
// and share an area: the phone's location, rounded by the server and kept only while one is on.

export const NEARBY_ALERT_RADIUS_MILES = 50;
export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  reportsAndCleanups: true,
  payments: true,
  newLitterNearby: false,
  cleanupsNearby: false,
});
const AREA_REFRESH_MILES = 1; // move this far and the saved area follows
const AREA_REFRESH_MS = 7 * 24 * 60 * 60 * 1000; // otherwise refresh it weekly
const askedKey = userId => `litterbugs.nearby-alert-asked.v1:${userId}`;
const COLUMNS = 'reports_and_cleanups, payments, new_litter_nearby, cleanups_nearby, nearby_decided_at';

// Last saved area per member, so following the phone's location costs nothing when nothing changed.
const saved = new Map();

export function deviceTimeZone() {
  try {
    return Localization.getCalendars?.()?.[0]?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** The map view that shows the whole alert area around a spot: 50 miles each way. */
export function nearbyAlertRegion({ latitude, longitude }) {
  const latitudeDelta = (NEARBY_ALERT_RADIUS_MILES * 2) / 69;
  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta: latitudeDelta / Math.max(0.2, Math.cos((latitude * Math.PI) / 180)),
  };
}

/** Whether the saved area should follow the phone: it moved a mile, the time zone changed, or it is a week old. */
export function areaNeedsRefresh(last, coordinate, timeZone, now = Date.now()) {
  if (!coordinate) return false;
  if (!last?.coordinate) return true;
  if (timeZone && last.timeZone !== timeZone) return true;
  if (now - (last.savedAt ?? 0) > AREA_REFRESH_MS) return true;
  const moved = distanceMiles(last.coordinate, coordinate);
  return moved === null || moved >= AREA_REFRESH_MILES;
}

const fromRow = row => ({
  reportsAndCleanups: row?.reports_and_cleanups ?? DEFAULT_NOTIFICATION_PREFERENCES.reportsAndCleanups,
  payments: row?.payments ?? DEFAULT_NOTIFICATION_PREFERENCES.payments,
  newLitterNearby: row?.new_litter_nearby ?? DEFAULT_NOTIFICATION_PREFERENCES.newLitterNearby,
  cleanupsNearby: row?.cleanups_nearby ?? DEFAULT_NOTIFICATION_PREFERENCES.cleanupsNearby,
});
const nearbyOn = preferences => preferences.newLitterNearby || preferences.cleanupsNearby;

// Before the server change is live, the table and function are missing. The settings still work:
// choices are kept on this phone and sent to the server the first time it accepts them.
const isUnavailable = error => ['42P01', 'PGRST205', 'PGRST202', '42883'].includes(error?.code);
const pendingKey = userId => `litterbugs.notification-preferences.pending.v1:${userId}`;

async function readPending(userId) {
  try {
    const value = JSON.parse(await AsyncStorage.getItem(pendingKey(userId)) || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}
const writePending = (userId, value) => AsyncStorage.setItem(pendingKey(userId), JSON.stringify(value)).catch(() => {});
const clearPending = userId => AsyncStorage.removeItem(pendingKey(userId)).catch(() => {});

async function sendToServer(userId, changes, coordinate) {
  const timeZone = deviceTimeZone();
  const { data, error } = await supabase.rpc('set_notification_preferences', {
    target_reports_and_cleanups: changes.reportsAndCleanups ?? null,
    target_payments: changes.payments ?? null,
    target_new_litter_nearby: changes.newLitterNearby ?? null,
    target_cleanups_nearby: changes.cleanupsNearby ?? null,
    target_latitude: coordinate?.latitude ?? null,
    target_longitude: coordinate?.longitude ?? null,
    target_time_zone: timeZone,
  });
  if (error) throw error;
  const preferences = fromRow(Array.isArray(data) ? data[0] : data);
  if (!nearbyOn(preferences)) saved.delete(userId);
  else if (coordinate) saved.set(userId, { coordinate, timeZone, savedAt: Date.now() });
  return preferences;
}

/**
 * { available, preferences, nearbyDecided } for a signed-in member. `available` is whether the
 * server has notification settings yet; the preferences are usable either way.
 */
export async function loadNotificationPreferences(userId) {
  if (!userId) return { available: false, preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES }, nearbyDecided: false };
  const pending = await readPending(userId);
  const { data, error } = await supabase.from('notification_preferences').select(COLUMNS).eq('user_id', userId).maybeSingle();
  if (error) {
    if (!isUnavailable(error)) throw error;
    return {
      available: false,
      preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES, ...pending?.preferences },
      nearbyDecided: Boolean(pending?.nearbyDecided),
    };
  }
  // Choices made on this phone before the server supported them: send them now.
  if (pending?.preferences) {
    try {
      const preferences = await sendToServer(userId, pending.preferences, nearbyOn(pending.preferences) ? pending.coordinate : null);
      await clearPending(userId);
      return { available: true, preferences, nearbyDecided: true };
    } catch {
      // Keep them for next time; show what the server has.
    }
  }
  const preferences = fromRow(data);
  if (!nearbyOn(preferences)) saved.delete(userId);
  return { available: true, preferences, nearbyDecided: Boolean(data?.nearby_decided_at) };
}

/**
 * Change some preferences ({ reportsAndCleanups, payments, newLitterNearby, cleanupsNearby }, any
 * subset). Turning a nearby alert on needs the phone's `coordinate`.
 */
export async function saveNotificationPreferences(userId, changes, coordinate = null) {
  try {
    return await sendToServer(userId, changes, coordinate);
  } catch (error) {
    if (!isUnavailable(error)) throw error;
    // Server not ready yet: keep the choice on this phone (sent later by loadNotificationPreferences).
    const pending = await readPending(userId);
    const preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...pending?.preferences, ...changes };
    const decided = pending?.nearbyDecided || changes.newLitterNearby !== undefined || changes.cleanupsNearby !== undefined;
    await writePending(userId, {
      preferences,
      nearbyDecided: decided,
      coordinate: nearbyOn(preferences) ? (coordinate ?? pending?.coordinate ?? null) : null,
    });
    return preferences;
  }
}

/** Keep the area of a nearby alert that is on with the phone. Cheap to call on every location update. */
export function followPhoneForNearbyAlerts(userId, coordinate) {
  const last = saved.get(userId);
  if (!userId || !last) return null; // only once a nearby alert is known to be on
  const timeZone = deviceTimeZone();
  if (!areaNeedsRefresh(last, coordinate, timeZone)) return null;
  saved.set(userId, { coordinate, timeZone, savedAt: Date.now() }); // no repeat while saving
  return saveNotificationPreferences(userId, {}, coordinate).catch(() => saved.set(userId, last));
}

/** Remember that a nearby alert is on, so its area follows the phone this session. */
export function trackNearbyAlerts(userId) {
  if (userId && !saved.has(userId)) saved.set(userId, { coordinate: null, timeZone: null, savedAt: 0 });
}

export async function wasAskedAboutNearbyAlerts(userId) {
  try { return (await AsyncStorage.getItem(askedKey(userId))) === 'yes'; } catch { return true; }
}

export function markAskedAboutNearbyAlerts(userId) {
  return AsyncStorage.setItem(askedKey(userId), 'yes').catch(() => {});
}
