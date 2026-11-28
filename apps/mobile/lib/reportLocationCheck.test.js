import { afterEach, describe, expect, it, vi } from 'vitest';
import { requireReportLocation, withinReportingDistance } from './reportLocationCheck';
afterEach(() => vi.useRealTimers());

const origin = { latitude: 0, longitude: 0 };
const api = (overrides = {}) => ({
  Accuracy: { High: 4 },
  getForegroundPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
  requestForegroundPermissionsAsync: vi.fn().mockResolvedValue({ granted: false }),
  getCurrentPositionAsync: vi.fn().mockResolvedValue({ coords: origin, timestamp: Date.now() }),
  ...overrides,
});

describe('GPS-required report publication', () => {
  it('accepts just inside and rejects just outside 50 miles', () => {
    const latitudeAt50 = 50 / 3958.8 * 180 / Math.PI;
    expect(withinReportingDistance(origin, { latitude: latitudeAt50 - 0.000001, longitude: 0 })).toBe(true);
    expect(withinReportingDistance(origin, { latitude: latitudeAt50 + 0.000001, longitude: 0 })).toBe(false);
    expect(withinReportingDistance({ latitude: 0, longitude: 179.9 }, { latitude: 0, longitude: -179.9 })).toBe(true);
    expect(withinReportingDistance({ latitude: NaN, longitude: 0 }, origin)).toBe(false);
  });
  it('requires permission, with no cached-location fallback', async () => {
    const location = api({ getForegroundPermissionsAsync: vi.fn().mockResolvedValue({ granted: false }) });
    await expect(requireReportLocation(location, origin)).rejects.toThrow('Allow location access');
    expect(location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });
  it('rejects stale fixes and reports outside the radius', async () => {
    await expect(requireReportLocation(api({ getCurrentPositionAsync: vi.fn().mockResolvedValue({ coords: origin, timestamp: Date.now() - 120000 }) }), origin)).rejects.toThrow('fresh location');
    await expect(requireReportLocation(api(), { latitude: 1, longitude: 0 })).rejects.toThrow('within 50 miles');
  });
  it('returns only the GPS evidence needed for publication', async () => {
    await expect(requireReportLocation(api(), origin)).resolves.toEqual({ ...origin, capturedAt: expect.any(String) });
  });
  it('makes a stalled GPS check retryable and correctly classifies the timeout', async () => {
    vi.useFakeTimers();
    const check = requireReportLocation(api({ getCurrentPositionAsync: () => new Promise(() => {}) }), origin);
    const result = expect(check).rejects.toMatchObject({ reason: 'location_timeout' });
    await vi.advanceTimersByTimeAsync(20000);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('keeps permission refusal separate from unavailable GPS and permits a fresh retry', async () => {
    const location = api({ getForegroundPermissionsAsync: vi.fn().mockResolvedValueOnce({ granted: false }).mockResolvedValue({ granted: true }) });
    await expect(requireReportLocation(location, origin)).rejects.toMatchObject({ reason: 'location_denied' });
    await expect(requireReportLocation(location, origin)).resolves.toMatchObject(origin);
    await expect(requireReportLocation(api({ getCurrentPositionAsync: vi.fn().mockRejectedValue(new Error('No provider')) }), origin)).rejects.toMatchObject({ reason: 'location_unavailable' });
    await expect(requireReportLocation(api({ getForegroundPermissionsAsync: vi.fn().mockRejectedValue(new Error('Unavailable')) }), origin)).rejects.toMatchObject({ reason: 'location_unavailable' });
  });
});
