// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';

import { GEOLOCATION_OPTIONS, getBrowserLocation, requireReportLocation } from './geolocation';

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

  it('requires a fresh high-accuracy reading for report submission', async () => {
    const position = { coords: { latitude: 0, longitude: 0 }, timestamp: Date.now() } as GeolocationPosition;
    const getCurrentPosition = vi.fn((success: PositionCallback) => success(position));
    await expect(requireReportLocation({ latitude: 0.7, longitude: 0 }, { getCurrentPosition })).resolves.toMatchObject({ latitude: 0, longitude: 0 });
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      enableHighAccuracy: true, timeout: 20000, maximumAge: 0,
    });
    await expect(requireReportLocation({ latitude: 1, longitude: 0 }, { getCurrentPosition })).rejects.toThrow('within 50 miles');
    const stale = { ...position, timestamp: Date.now() - 120000 };
    await expect(requireReportLocation({ latitude: 0, longitude: 0 }, {
      getCurrentPosition: success => success(stale),
    })).rejects.toThrow('fresh location');
  });
});
