import { describe, expect, it, vi } from 'vitest';

import {
  findResponsiveUserLocation,
  mapRegionsAreEquivalent,
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

  it('ignores tiny native map rounding differences', () => {
    const first = { latitude: 35, longitude: -82, latitudeDelta: 0.02, longitudeDelta: 0.02 };
    const rounded = { ...first, latitude: 35.0000004, longitudeDelta: 0.0200003 };
    expect(mapRegionsAreEquivalent(first, rounded)).toBe(true);
    expect(mapRegionsAreEquivalent(first, { ...first, latitude: 35.01 })).toBe(false);
  });
});
