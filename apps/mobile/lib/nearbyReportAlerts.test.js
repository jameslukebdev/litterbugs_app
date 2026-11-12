import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: supabaseMock }));
vi.mock('expo-localization', () => ({ getCalendars: () => [{ timeZone: 'America/New_York' }] }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: vi.fn(), setItem: vi.fn(() => Promise.resolve()) } }));

const {
  areaNeedsRefresh,
  followPhoneForNearbyAlerts,
  loadNearbyReportAlerts,
  nearbyAlertRegion,
  setNearbyReportAlerts,
  trackEnabledNearbyAlert,
} = await import('./nearbyReportAlerts');

const boone = { latitude: 36.2168, longitude: -81.6746 };
const selectReturning = (result) => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(result) }) }) });

describe('daily nearby report alert', () => {
  beforeEach(() => { supabaseMock.from.mockReset(); supabaseMock.rpc.mockReset(); });

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
    await expect(loadNearbyReportAlerts('user')).resolves.toEqual({ available: false, enabled: false, decided: false });
  });

  it('tells apart never asked, turned off and turned on', async () => {
    supabaseMock.from.mockReturnValue(selectReturning({ data: null, error: null }));
    await expect(loadNearbyReportAlerts('user')).resolves.toEqual({ available: true, enabled: false, decided: false });
    supabaseMock.from.mockReturnValue(selectReturning({ data: { enabled: false }, error: null }));
    await expect(loadNearbyReportAlerts('user')).resolves.toEqual({ available: true, enabled: false, decided: true });
    supabaseMock.from.mockReturnValue(selectReturning({ data: { enabled: true }, error: null }));
    await expect(loadNearbyReportAlerts('user')).resolves.toEqual({ available: true, enabled: true, decided: true });
  });

  it('sends the phone location and time zone when turning on, and nothing when turning off', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: [{ alerts_enabled: true, has_area: true }], error: null });
    await expect(setNearbyReportAlerts('user', { enabled: true, coordinate: boone })).resolves.toEqual({ enabled: true, hasArea: true });
    expect(supabaseMock.rpc).toHaveBeenLastCalledWith('set_nearby_report_alerts', {
      target_enabled: true, target_latitude: boone.latitude, target_longitude: boone.longitude, target_time_zone: 'America/New_York',
    });
    supabaseMock.rpc.mockResolvedValue({ data: [{ alerts_enabled: false, has_area: false }], error: null });
    await setNearbyReportAlerts('user', { enabled: false, coordinate: boone });
    expect(supabaseMock.rpc).toHaveBeenLastCalledWith('set_nearby_report_alerts', {
      target_enabled: false, target_latitude: null, target_longitude: null, target_time_zone: 'America/New_York',
    });
  });

  it('keeps an alert that is on with the phone, without saving again when nothing changed', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: [{ alerts_enabled: true, has_area: true }], error: null });
    expect(followPhoneForNearbyAlerts('other', boone)).toBeNull(); // not known to be on
    trackEnabledNearbyAlert('other');
    await followPhoneForNearbyAlerts('other', boone);
    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(followPhoneForNearbyAlerts('other', { latitude: 36.2169, longitude: -81.6746 })).toBeNull();
    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
  });
});
