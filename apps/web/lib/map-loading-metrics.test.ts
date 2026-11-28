import { expect, it, vi } from 'vitest';
import { createMapLoadTracker, mapLoadingProperties, type MapLoadingFailure } from './map-loading-metrics';

function fixture() {
  let clock = 1000;
  const emit = vi.fn();
  const tracker = createMapLoadTracker(emit, () => clock);
  return { emit, tracker, advance: (ms: number) => { clock += ms; } };
}

it('times the first tiles only and ignores repeated map tiles/pan refreshes', () => {
  const { emit, tracker, advance } = fixture();
  tracker.start(); tracker.start(); advance(2345);
  tracker.tilesReady(); advance(30000); tracker.tilesReady();
  expect(emit.mock.calls.map(([signal]) => signal)).toEqual([
    { stage: 'started', elapsed_ms: 0, backgrounded: false },
    { stage: 'tiles_ready', elapsed_ms: 2300, backgrounded: false },
  ]);
});

it('preserves a timeout and reports a later recovery once, instead of counting a clean load', () => {
  const { emit, tracker, advance } = fixture();
  advance(12000); tracker.fail('startup_timeout'); tracker.fail('startup_timeout');
  advance(4000); tracker.tilesReady(); tracker.tilesReady();
  expect(emit.mock.calls.map(([signal]) => [signal.stage, signal.reason, signal.elapsed_ms])).toEqual([
    ['started', undefined, 12000], ['failed', 'startup_timeout', 12000], ['recovered', undefined, 16000],
  ]);
});

it.each(['configuration_missing', 'initialization_failed', 'authorization_failed', 'marker_render_failed'] as MapLoadingFailure[])('records %s once even before a ready map, without a false success', reason => {
  const { emit, tracker } = fixture();
  tracker.fail(reason); tracker.fail(reason); tracker.tilesReady();
  expect(emit.mock.calls.map(([signal]) => signal.stage)).toEqual(['started', 'failed']);
  expect(emit).toHaveBeenLastCalledWith({ stage: 'failed', reason, elapsed_ms: 0, backgrounded: false });
});

it('still records a pin failure after tiles have loaded', () => {
  const { emit, tracker, advance } = fixture();
  tracker.tilesReady(); advance(800); tracker.fail('marker_render_failed');
  expect(emit).toHaveBeenLastCalledWith({ stage: 'failed', reason: 'marker_render_failed', elapsed_ms: 800, backgrounded: false });
});

it('marks hidden-tab timing and silences discarded/unmounted instances', () => {
  const { emit, tracker, advance } = fixture();
  tracker.start(); tracker.background(); advance(5000); tracker.tilesReady();
  expect(emit).toHaveBeenLastCalledWith({ stage: 'tiles_ready', elapsed_ms: 5000, backgrounded: true });
  tracker.dispose(); tracker.fail('authorization_failed'); tracker.tilesReady();
  expect(emit).toHaveBeenCalledTimes(2);
  const discarded = createMapLoadTracker(emit);
  discarded.dispose(); discarded.start(); discarded.fail('initialization_failed');
  expect(emit).toHaveBeenCalledTimes(2);
});

it('does not let a failed analytics provider throw into map startup', () => {
  const tracker = createMapLoadTracker(() => { throw new Error('Provider unavailable'); });
  expect(() => { tracker.start(); tracker.tilesReady(); tracker.fail('marker_render_failed'); }).not.toThrow();
});

it('bounds timings and rejects unknown outcomes/reasons while discarding private payload fields', () => {
  const value = { stage: 'failed', elapsed_ms: 999999, backgrounded: true, reason: 'initialization_failed', latitude: 36, url: 'private', error: 'secret' };
  expect(mapLoadingProperties(value)).toEqual({ stage: 'failed', elapsed_ms: 120000, backgrounded: true, reason: 'initialization_failed' });
  for (const change of [
    { stage: 'private error' }, { reason: 'private error' }, { elapsed_ms: Infinity },
    { elapsed_ms: NaN }, { elapsed_ms: -1 }, { elapsed_ms: '12' }, { backgrounded: 'false' },
  ]) expect(mapLoadingProperties({ ...value, ...change })).toBeNull();
});
