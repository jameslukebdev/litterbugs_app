import { describe, expect, it, vi } from 'vitest';
import { requireReportLocation, withinReportingDistance } from './reportLocationCheck';

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
});
