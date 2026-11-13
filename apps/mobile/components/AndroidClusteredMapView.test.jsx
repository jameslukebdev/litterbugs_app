// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AndroidClusteredMapView from './AndroidClusteredMapView';

const capture = vi.hoisted(() => ({ props: null }));
vi.mock('react-native-map-clustering', () => ({
  default: (props) => { capture.props = props; return null; },
}));
const home = { latitude: 36, longitude: -81, latitudeDelta: 0.1, longitudeDelta: 0.1 };
let root;
let container;
let previousActEnvironment;
let mapRef;

beforeEach(() => {
  previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  root = createRoot(container);
  mapRef = { current: { animateToRegion: vi.fn() } };
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
});
function render(region, callback = vi.fn()) {
  act(() => root.render(<AndroidClusteredMapView ref={mapRef} region={region} onRegionChangeComplete={callback} />));
}

describe('Android camera ownership', () => {
  it('does not send settled native positions back as camera commands', () => {
    render(home);
    expect(capture.props.region).toBeUndefined();
    expect(mapRef.current.animateToRegion).not.toHaveBeenCalled();
    const moved = { ...home, longitude: -80.9 };
    const callback = vi.fn();
    render(home, callback);
    act(() => capture.props.onRegionChangeComplete(moved, { isGesture: true }));
    render(moved, callback);
    expect(callback).toHaveBeenCalledWith(moved, { isGesture: true });
    expect(mapRef.current.animateToRegion).not.toHaveBeenCalled();
  });

  it('moves for a new external request, then ignores its native acknowledgement', () => {
    render(home);
    const searched = { ...home, longitude: -82 };
    render(searched);
    expect(mapRef.current.animateToRegion).toHaveBeenCalledExactlyOnceWith(searched, 240);
    const settled = { ...searched, longitude: -82.00002 };
    act(() => capture.props.onRegionChangeComplete(settled, { isGesture: false }));
    render(settled);
    expect(mapRef.current.animateToRegion).toHaveBeenCalledTimes(1);
    expect(capture.props.moveOnMarkerPress).toBe(false);
  });
});
