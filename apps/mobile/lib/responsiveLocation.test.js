import { describe, expect, it, vi } from 'vitest';

import {
  findResponsiveUserLocation,
  mapRegionsAreEquivalent,
  reportLocationRegion,
  userLocationRegion,
} from './responsiveLocation';

const cached = { coords: { latitude: 35.1, longitude: -82.1 } };
const fresh = { coords: { latitude: 35.2, longitude: -82.2 } };

describe('responsive location', () => {
  it('centers immediately with a recent cached position, then refines it', async () => {
    const onPosition = vi.fn();
    const result = await findResponsiveUserLocation({
      locationApi: {
        Accuracy: { Balanced: 3 },
        getLastKnownPositionAsync: vi.fn().mockResolvedValue(cached),
        getCurrentPositionAsync: vi.fn().mockResolvedValue(fresh),
      },
      onPosition,
    });

    expect(onPosition).toHaveBeenNthCalledWith(1, cached, { cached: true });
    expect(onPosition).toHaveBeenNthCalledWith(2, fresh, { cached: false });
    expect(result.refreshTimedOut).toBe(false);
  });

  it('builds the map region used by the recenter control', () => {
    expect(userLocationRegion(fresh)).toEqual({
      latitude: 35.2,
      longitude: -82.2,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  });

  it('uses a tighter region for placing a new report', () => {
    expect(reportLocationRegion(fresh)).toEqual({
      latitude: 35.2,
      longitude: -82.2,
      latitudeDelta: 0.0015,
      longitudeDelta: 0.0015,
    });
  });

  it('supports a higher-accuracy fix for report placement', async () => {
    const getCurrentPositionAsync = vi.fn().mockResolvedValue(fresh);
    await findResponsiveUserLocation({
      locationApi: {
        Accuracy: { Balanced: 3, High: 4 },
        getLastKnownPositionAsync: vi.fn().mockResolvedValue(null),
        getCurrentPositionAsync,
      },
      onPosition: vi.fn(),
      accuracy: 4,
    });

    expect(getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 4 });
  });

  it('ignores tiny native map rounding differences', () => {
    const first = { latitude: 35, longitude: -82, latitudeDelta: 0.02, longitudeDelta: 0.02 };
    const rounded = { ...first, latitude: 35.0000004, longitudeDelta: 0.0200003 };
    expect(mapRegionsAreEquivalent(first, rounded)).toBe(true);
    expect(mapRegionsAreEquivalent(first, { ...first, latitude: 35.01 })).toBe(false);
  });
});
