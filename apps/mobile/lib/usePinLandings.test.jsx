// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import usePinLandings from './usePinLandings';

const home = { latitude: 36, longitude: -81, latitudeDelta: 0.1, longitudeDelta: 0.1 };
const away = { ...home, longitude: -80.8 };
const info = { coordinate: { latitude: 36, longitude: -81 }, kind: 'open', text: null };
let root;
let container;
let pins;
let previousActEnvironment;

function mountPins(inPlace = false, replayOnReentry = false) {
  const mapRef = { current: { pointForCoordinate: vi.fn().mockResolvedValue({ x: 150, y: 200 }) } };
  function Probe() {
    pins = usePinLandings({ enabled: true, mapRef, region: home, hidden: false, inPlace, replayOnReentry });
    return null;
  }
  act(() => root.render(<Probe />));
}

async function settle(region) {
  await act(async () => {
    pins.regionSettled(region);
    await vi.advanceTimersByTimeAsync(16);
  });
}

async function landInitially(key) {
  act(() => pins.track(key, info));
  await settle(home);
  act(() => pins.ghostDone(key));
  await act(async () => { await vi.advanceTimersByTimeAsync(140); });
  expect(pins.isShown(key)).toBe(true);
  expect(pins.ghosts).toHaveLength(0);
}

beforeEach(() => {
  vi.useFakeTimers();
  previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  vi.clearAllTimers();
  vi.useRealTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  container.remove();
});

describe('iPhone pins returning to view', () => {
  it.each(['report-a', 'group:a,b'])('hides a landed %s before it returns, then plays its complete landing', async (key) => {
    mountPins();
    await landInitially(key);

    act(() => pins.regionChanging(away));
    expect(pins.isShown(key)).toBe(false);
    await settle(away);
    expect(pins.isShown(key)).toBe(false);

    act(() => pins.regionChanging(home));
    expect(pins.isShown(key)).toBe(false);
    expect(pins.ghosts).toHaveLength(0);
    await settle(home);
    expect(pins.isShown(key)).toBe(false);
    expect(pins.ghosts).toHaveLength(1);
    expect(pins.ghosts[0]).toMatchObject({ key, x: 150, y: 200 });
    expect(pins.ghosts[0].handover).not.toBe(true);

    act(() => pins.ghostDone(key));
    expect(pins.isShown(key)).toBe(true);
  });

  it('replays the full landing even when the pin leaves and returns during one continuous swipe', async () => {
    mountPins();
    await landInitially('a');
    act(() => {
      pins.regionChanging(away);
      pins.regionChanging(home);
    });
    expect(pins.isShown('a')).toBe(false);
    await settle(home);
    expect(pins.ghosts).toHaveLength(1);
    expect(pins.isShown('a')).toBe(false);
  });

  it('keeps an already landed pin still when it remains inside the viewport', async () => {
    mountPins();
    await landInitially('a');
    const nearby = { ...home, longitude: home.longitude + 0.01 };
    act(() => pins.regionChanging(nearby));
    await settle(nearby);
    expect(pins.isShown('a')).toBe(true);
    expect(pins.ghosts).toHaveLength(0);
  });

  it('does not let the previous landing cleanup cut short a quick return', async () => {
    mountPins();
    act(() => pins.track('a', info));
    await settle(home);
    act(() => pins.ghostDone('a'));
    act(() => {
      pins.regionChanging(away);
      pins.regionChanging(home);
    });
    await settle(home);
    expect(pins.ghosts).toHaveLength(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(140); });
    expect(pins.ghosts).toHaveLength(1);
    expect(pins.ghosts[0].handover).not.toBe(true);
    expect(pins.isShown('a')).toBe(false);
  });
});

it('preserves Android: an already drawn off-screen pin returns without a new drop', async () => {
  mountPins(true);
  act(() => pins.track('a', info));
  await settle(home);
  const firstDrop = pins.dropFor('a');
  expect(firstDrop).toBeDefined();
  act(() => pins.regionChanging(away));
  await settle(away);
  expect(pins.isShown('a')).toBe(true);
  act(() => pins.regionChanging(home));
  await settle(home);
  expect(pins.isShown('a')).toBe(true);
  expect(pins.dropFor('a')).toBe(firstDrop);
  expect(pins.ghosts).toHaveLength(0);
});

describe('Android rediscovery enabled', () => {
  it('starts a rediscovered pin during the pan, before the map settles', async () => {
    mountPins(true, true);
    act(() => pins.track('a', info));
    await settle(home);
    const original = pins.dropFor('a');
    act(() => pins.regionChanging(away));
    await act(async () => { await vi.advanceTimersByTimeAsync(16); });
    expect(pins.isShown('a')).toBe(false);
    act(() => pins.regionChanging(home));
    await act(async () => { await vi.advanceTimersByTimeAsync(16); });
    expect(pins.dropFor('a').token).toBeGreaterThan(original.token);
    expect(pins.isShown('a')).toBe(true);
  });

  it('does not postpone the drop on every continuous camera event', async () => {
    mountPins(true, true);
    act(() => pins.track('a', info));
    await settle(away);
    act(() => pins.regionChanging(home));
    await act(async () => { await vi.advanceTimersByTimeAsync(8); });
    act(() => pins.regionChanging({ ...home, longitude: home.longitude + 0.001 }));
    await act(async () => { await vi.advanceTimersByTimeAsync(8); });
    expect(pins.dropFor('a')).toBeDefined();
    expect(pins.isShown('a')).toBe(true);
  });

  it.each(['report-a', 'group:a,b'])('hides %s off screen and sends a fresh native drop on return', async (key) => {
    mountPins(true, true);
    act(() => pins.track(key, info));
    await settle(home);
    const original = pins.dropFor(key);
    expect(pins.isShown(key)).toBe(true);
    act(() => pins.regionChanging(away));
    expect(pins.isShown(key)).toBe(false);
    await settle(away);
    expect(pins.isShown(key)).toBe(false);
    act(() => pins.regionChanging(home));
    expect(pins.isShown(key)).toBe(false);
    await settle(home);
    expect(pins.dropFor(key).token).toBeGreaterThan(original.token);
    expect(pins.isShown(key)).toBe(true);
    expect(pins.ghosts).toHaveLength(0);
  });

  it('replays after going out and back without stopping the gesture', async () => {
    mountPins(true, true);
    act(() => pins.track('a', info));
    await settle(home);
    const original = pins.dropFor('a');
    act(() => {
      pins.regionChanging(away);
      pins.regionChanging(home);
    });
    await settle(home);
    expect(pins.dropFor('a').token).toBeGreaterThan(original.token);
  });

  it('does not replay a pin that stays visible while the map moves', async () => {
    mountPins(true, true);
    act(() => pins.track('a', info));
    await settle(home);
    const original = pins.dropFor('a');
    const nearby = { ...home, longitude: home.longitude + 0.01 };
    act(() => pins.regionChanging(nearby));
    await settle(nearby);
    expect(pins.dropFor('a')).toBe(original);
  });
});
