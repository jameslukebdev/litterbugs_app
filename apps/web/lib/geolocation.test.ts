// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { GEOLOCATION_OPTIONS, getBrowserLocation } from './geolocation';

describe('browser geolocation', () => {
  it('returns allowed coordinates with the production request options', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({ coords: { latitude: 35.994, longitude: -78.8986 } } as GeolocationPosition);
    });

    await expect(getBrowserLocation({ getCurrentPosition })).resolves.toEqual({
      latitude: 35.994,
      longitude: -78.8986,
    });
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      GEOLOCATION_OPTIONS,
    );
  });

  it('preserves a browser permission denial', async () => {
    const denied = { code: 1, message: 'User denied Geolocation' } as GeolocationPositionError;
    const getCurrentPosition = vi.fn((_success: PositionCallback, failure: PositionErrorCallback) => {
      failure(denied);
    });

    await expect(getBrowserLocation({ getCurrentPosition })).rejects.toBe(denied);
  });

  it('fails closed when browser geolocation is unavailable', async () => {
    await expect(getBrowserLocation(undefined)).rejects.toThrow('unavailable');
  });
});
