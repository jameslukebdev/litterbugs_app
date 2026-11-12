import { describe, expect, it } from 'vitest';
import { regionWithPointAt, SELECTED_PIN_HEIGHT } from './mapFraming';

describe('framing a tapped pin', () => {
  const region = { latitude: 36.2, longitude: -81.7, latitudeDelta: 0.04, longitudeDelta: 0.02 };
  const pin = { latitude: 36.21, longitude: -81.69 };

  it('keeps the zoom and centres the pin left to right', () => {
    const next = regionWithPointAt(region, pin, 262, 874);
    expect(next.latitudeDelta).toBe(region.latitudeDelta);
    expect(next.longitudeDelta).toBe(region.longitudeDelta);
    expect(next.longitude).toBe(pin.longitude);
  });

  it('puts the pin above the middle of the screen, where the card does not cover it', () => {
    const height = 874;
    const next = regionWithPointAt(region, pin, SELECTED_PIN_HEIGHT * height, height);
    // The pin is north of the new centre, by the share of the screen between it and the middle.
    expect(pin.latitude - next.latitude).toBeCloseTo((0.5 - SELECTED_PIN_HEIGHT) * region.latitudeDelta, 10);
    // Its spot on screen, counting down from the top edge of the view.
    const top = next.latitude + region.latitudeDelta / 2;
    expect(((top - pin.latitude) / region.latitudeDelta) * height).toBeCloseTo(SELECTED_PIN_HEIGHT * height, 6);
  });
});
