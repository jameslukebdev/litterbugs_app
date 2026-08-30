import { describe, expect, it, vi } from 'vitest';

import { centerMapFromExistingLocationPermission } from './mapLocation';

describe('map startup location behavior', () => {
  it('does not request or read location when permission has not already been granted', async () => {
    const getCurrentPosition = vi.fn();
    const commitMapRegion = vi.fn();

    const result = await centerMapFromExistingLocationPermission({
      getForegroundPermissions: vi.fn().mockResolvedValue({ status: 'undetermined' }),
      getCurrentPosition,
      commitMapRegion,
    });

    expect(result).toEqual({ status: 'skipped' });
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(commitMapRegion).not.toHaveBeenCalled();
  });

  it('centers the map without prompting when location access already exists', async () => {
    const commitMapRegion = vi.fn();

    const result = await centerMapFromExistingLocationPermission({
      getForegroundPermissions: vi.fn().mockResolvedValue({ status: 'granted' }),
      getCurrentPosition: vi.fn().mockResolvedValue({
        coords: { latitude: 35.9141, longitude: -81.5384 },
      }),
      commitMapRegion,
    });

    expect(result).toEqual({ status: 'centered' });
    expect(commitMapRegion).toHaveBeenCalledWith({
      latitude: 35.9141,
      longitude: -81.5384,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  });
});
