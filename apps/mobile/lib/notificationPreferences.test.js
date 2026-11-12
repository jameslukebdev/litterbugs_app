import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: supabaseMock }));
vi.mock('expo-localization', () => ({ getCalendars: () => [{ timeZone: 'America/New_York' }] }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: vi.fn(), setItem: vi.fn(() => Promise.resolve()) } }));

const {
  areaNeedsRefresh,
  DEFAULT_NOTIFICATION_PREFERENCES,
  followPhoneForNearbyAlerts,
  loadNotificationPreferences,
  nearbyAlertRegion,
  saveNotificationPreferences,
  trackNearbyAlerts,
} = await import('./notificationPreferences');

const boone = { latitude: 36.2168, longitude: -81.6746 };
const selectReturning = (result) => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(result) }) }) });
const row = (overrides = {}) => ({
  reports_and_cleanups: true, payments: true, new_litter_nearby: false, cleanups_nearby: false, nearby_decided_at: null, ...overrides,
});

describe('notification preferences', () => {
  beforeEach(() => { supabaseMock.from.mockReset(); supabaseMock.rpc.mockReset(); });

  it('starts with activity and payments on and the nearby alerts off', () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES).toEqual({ reportsAndCleanups: true, payments: true, newLitterNearby: false, cleanupsNearby: false });
  });

  it('shows the whole 50-mile alert area around the person', () => {
    const region = nearbyAlertRegion(boone);
    expect(region.latitudeDelta * 69).toBeCloseTo(100, 5);
    expect(region.longitudeDelta * 69 * Math.cos((boone.latitude * Math.PI) / 180)).toBeCloseTo(100, 5);
  });

  it('follows the phone only when it moved a mile, changed time zone, or a week passed', () => {
    const now = Date.now();
    const last = { coordinate: boone, timeZone: 'America/New_York', savedAt: now - 1000 };
    expect(areaNeedsRefresh(last, { latitude: 36.2178, longitude: -81.6746 }, 'America/New_York', now)).toBe(false);
    expect(areaNeedsRefresh(last, { latitude: 36.24, longitude: -81.6746 }, 'America/New_York', now)).toBe(true);
    expect(areaNeedsRefresh(last, boone, 'America/Chicago', now)).toBe(true);
    expect(areaNeedsRefresh({ ...last, savedAt: now - 8 * 24 * 3600 * 1000 }, boone, 'America/New_York', now)).toBe(true);
    expect(areaNeedsRefresh(null, boone, 'America/New_York', now)).toBe(true);
    expect(areaNeedsRefresh(last, null, 'America/New_York', now)).toBe(false);
  });

  it('stays hidden until the server supports it', async () => {
    supabaseMock.from.mockReturnValue(selectReturning({ data: null, error: { code: 'PGRST205' } }));
    await expect(loadNotificationPreferences('user')).resolves.toMatchObject({ available: false, nearbyDecided: false });
  });

  it('reads the defaults for a new member, and their own choices after that', async () => {
    supabaseMock.from.mockReturnValue(selectReturning({ data: null, error: null }));
    await expect(loadNotificationPreferences('user')).resolves.toEqual({ available: true, preferences: DEFAULT_NOTIFICATION_PREFERENCES, nearbyDecided: false });
    supabaseMock.from.mockReturnValue(selectReturning({ data: row({ payments: false, cleanups_nearby: true, nearby_decided_at: '2026-11-12' }), error: null }));
    await expect(loadNotificationPreferences('user')).resolves.toEqual({
      available: true,
      preferences: { reportsAndCleanups: true, payments: false, newLitterNearby: false, cleanupsNearby: true },
      nearbyDecided: true,
    });
  });

  it('sends only what changed, with the phone location and time zone for a nearby alert', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: [row({ new_litter_nearby: true })], error: null });
    await expect(saveNotificationPreferences('user', { newLitterNearby: true }, boone)).resolves.toMatchObject({ newLitterNearby: true });
    expect(supabaseMock.rpc).toHaveBeenLastCalledWith('set_notification_preferences', {
      target_reports_and_cleanups: null, target_payments: null, target_new_litter_nearby: true, target_cleanups_nearby: null,
      target_latitude: boone.latitude, target_longitude: boone.longitude, target_time_zone: 'America/New_York',
    });
    supabaseMock.rpc.mockResolvedValue({ data: [row({ payments: false })], error: null });
    await saveNotificationPreferences('user', { payments: false });
    expect(supabaseMock.rpc).toHaveBeenLastCalledWith('set_notification_preferences', {
      target_reports_and_cleanups: null, target_payments: false, target_new_litter_nearby: null, target_cleanups_nearby: null,
      target_latitude: null, target_longitude: null, target_time_zone: 'America/New_York',
    });
  });

  it('keeps nearby alerts that are on with the phone, without saving again when nothing changed', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: [row({ cleanups_nearby: true })], error: null });
    expect(followPhoneForNearbyAlerts('other', boone)).toBeNull(); // not known to be on
    trackNearbyAlerts('other');
    await followPhoneForNearbyAlerts('other', boone);
    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(followPhoneForNearbyAlerts('other', { latitude: 36.2169, longitude: -81.6746 })).toBeNull();
    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
  });
});
