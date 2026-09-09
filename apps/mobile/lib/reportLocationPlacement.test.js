import { describe, expect, it } from 'vitest';

import { mapCenterCoordinate } from './reportLocationPlacement';

describe('report location placement', () => {
  it('uses the visible map center as the selected report coordinate', () => {
    expect(mapCenterCoordinate({
      latitude: 35.5951,
      longitude: -82.5515,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    })).toEqual({
      latitude: 35.5951,
      longitude: -82.5515,
    });
  });

  it('rejects a missing or invalid map center', () => {
    expect(mapCenterCoordinate(null)).toBeNull();
    expect(mapCenterCoordinate({ latitude: null, longitude: null })).toBeNull();
    expect(mapCenterCoordinate({ latitude: 91, longitude: 0 })).toBeNull();
    expect(mapCenterCoordinate({ latitude: 0, longitude: 181 })).toBeNull();
    expect(mapCenterCoordinate({ latitude: 0, longitude: 0 })).toEqual({ latitude: 0, longitude: 0 });
    expect(mapCenterCoordinate({ latitude: 'unknown', longitude: -82.5 })).toBeNull();
  });
});
