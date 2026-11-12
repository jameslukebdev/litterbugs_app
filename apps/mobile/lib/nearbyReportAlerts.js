import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import { distanceMiles } from './reportFilters';
import { supabase } from './supabase';

// The daily "New litter near you" alert (supabase/migrations/*_nearby_report_alerts.sql): once a
// day at 5 pm, if new litter was reported within 50 miles. The member's area is their phone's
// location, rounded by the server and kept only while the alert is on.

export const NEARBY_ALERT_RADIUS_MILES = 50;
const AREA_REFRESH_MILES = 1; // move this far and the saved area follows
const AREA_REFRESH_MS = 7 * 24 * 60 * 60 * 1000; // otherwise refresh it weekly
const askedKey = userId => `litterbugs.nearby-alert-asked.v1:${userId}`;

// Last saved state per member, so following the phone's location costs nothing when nothing changed.
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

// Before the server change is live, the table is missing: the feature stays hidden.
const isUnavailable = error => ['42P01', 'PGRST205', 'PGRST202', '42883'].includes(error?.code);

/** { available, enabled, decided } for a signed-in member. */
export async function loadNearbyReportAlerts(userId) {
  if (!userId) return { available: false, enabled: false, decided: false };
  const { data, error } = await supabase.from('nearby_report_alerts').select('enabled').eq('user_id', userId).maybeSingle();
  if (error) {
    if (isUnavailable(error)) return { available: false, enabled: false, decided: false };
    throw error;
  }
  if (!data?.enabled) saved.delete(userId);
  return { available: true, enabled: Boolean(data?.enabled), decided: Boolean(data) };
}

/** Turn the alert on (with the phone's location) or off. */
export async function setNearbyReportAlerts(userId, { enabled, coordinate = null }) {
  const timeZone = deviceTimeZone();
  const { data, error } = await supabase.rpc('set_nearby_report_alerts', {
    target_enabled: enabled,
    target_latitude: enabled && coordinate ? coordinate.latitude : null,
    target_longitude: enabled && coordinate ? coordinate.longitude : null,
    target_time_zone: timeZone,
  });
  if (error) throw error;
  if (enabled && coordinate) saved.set(userId, { coordinate, timeZone, savedAt: Date.now() });
  else if (!enabled) saved.delete(userId);
  const row = Array.isArray(data) ? data[0] : data;
  return { enabled: Boolean(row?.alerts_enabled), hasArea: Boolean(row?.has_area) };
}

/** Keep an enabled alert's area with the phone. Cheap to call on every location update. */
export function followPhoneForNearbyAlerts(userId, coordinate) {
  const last = saved.get(userId);
  if (!userId || !last) return null; // only once the alert is known to be on (set this session)
  const timeZone = deviceTimeZone();
  if (!areaNeedsRefresh(last, coordinate, timeZone)) return null;
  saved.set(userId, { coordinate, timeZone, savedAt: Date.now() }); // no repeat while saving
  return setNearbyReportAlerts(userId, { enabled: true, coordinate }).catch(() => saved.set(userId, last));
}

/** Remember that an alert that is on should follow the phone this session. */
export function trackEnabledNearbyAlert(userId) {
  if (userId && !saved.has(userId)) saved.set(userId, { coordinate: null, timeZone: null, savedAt: 0 });
}

export async function wasAskedAboutNearbyAlerts(userId) {
  try { return (await AsyncStorage.getItem(askedKey(userId))) === 'yes'; } catch { return true; }
}

export function markAskedAboutNearbyAlerts(userId) {
  return AsyncStorage.setItem(askedKey(userId), 'yes').catch(() => {});
}
