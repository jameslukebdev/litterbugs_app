export type MapLoadingStage = 'started' | 'tiles_ready' | 'failed' | 'recovered';
export type MapLoadingFailure = 'configuration_missing' | 'initialization_failed' | 'authorization_failed' | 'startup_timeout' | 'marker_render_failed';
export type MapLoadingSignal = { stage: MapLoadingStage; elapsed_ms: number; backgrounded: boolean; reason?: MapLoadingFailure };
const FAILURES: readonly string[] = ['configuration_missing', 'initialization_failed', 'authorization_failed', 'startup_timeout', 'marker_render_failed'];

/** Fixed dimensions only. Duration is effect start → signal, rounded to 100ms, capped at 2min. */
export function mapLoadingProperties(value: { stage?: unknown; elapsed_ms?: unknown; backgrounded?: unknown; reason?: unknown }): MapLoadingSignal | null {
  if (!['started', 'tiles_ready', 'failed', 'recovered'].includes(value.stage as string)
    || typeof value.elapsed_ms !== 'number' || !Number.isFinite(value.elapsed_ms) || value.elapsed_ms < 0
    || typeof value.backgrounded !== 'boolean') return null;
  if (value.stage === 'failed' && !FAILURES.includes(value.reason as string)) return null;
  return {
    stage: value.stage as MapLoadingStage,
    elapsed_ms: Math.min(120000, Math.round(value.elapsed_ms / 100) * 100),
    backgrounded: value.backgrounded,
    ...(value.stage === 'failed' ? { reason: value.reason as MapLoadingFailure } : {}),
  };
}

/** One map instance, independent of panning, polling and repeated tilesloaded callbacks. */
export function createMapLoadTracker(emit: (signal: MapLoadingSignal) => void, now: () => number = () => performance.now(), initiallyHidden = false) {
  const startedAt = now();
  let started = false;
  let tilesReady = false;
  let backgrounded = initiallyHidden;
  let disposed = false;
  const failures = new Set<MapLoadingFailure>();
  const send = (stage: MapLoadingStage, reason?: MapLoadingFailure) => {
    const signal = mapLoadingProperties({ stage, reason, elapsed_ms: Math.max(0, now() - startedAt), backgrounded });
    if (signal) { try { emit(signal); } catch { /* Measurement must never affect the map. */ } }
  };
  const start = () => {
    if (disposed || started) return;
    started = true;
    send('started');
  };
  return {
    start,
    background: () => { backgrounded = true; },
    tilesReady: () => {
      if (disposed || tilesReady || [...failures].some(reason => reason !== 'startup_timeout')) return;
      start();
      tilesReady = true;
      // Only the timeout is recoverable in the existing map UI.
      send(failures.has('startup_timeout') ? 'recovered' : 'tiles_ready');
    },
    fail: (reason: MapLoadingFailure) => {
      if (disposed || failures.has(reason)) return;
      start();
      failures.add(reason);
      send('failed', reason);
    },
    dispose: () => { disposed = true; },
  };
}
