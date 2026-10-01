'use client';
import { useMemo, useSyncExternalStore } from 'react';
const DATA_CHANGED = 'litterbugs:data-changed';
export function notifyDataChanged() { window.dispatchEvent(new Event(DATA_CHANGED)); }

// All visible subscribers at the same cadence share one clock and event listener
// set. A large report list must not create one interval for every author's badge.
const clocks = new Map<number, ReturnType<typeof createClock>>();
function createClock(intervalMs: number) {
  let revision = 0;
  let stop: (() => void) | undefined;
  const listeners = new Set<() => void>();
  return {
    snapshot: () => revision,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      if (!stop) {
        let lastRefresh = 0;
        const refresh = () => {
          if (document.visibilityState === 'hidden' || navigator.onLine === false || Date.now() - lastRefresh < 500) return;
          lastRefresh = Date.now(); revision++;
          listeners.forEach(notify => notify());
        };
        const timer = window.setInterval(refresh, intervalMs);
        window.addEventListener('focus', refresh); window.addEventListener('online', refresh);
        window.addEventListener(DATA_CHANGED, refresh); document.addEventListener('visibilitychange', refresh);
        stop = () => {
          window.clearInterval(timer);
          window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh);
          window.removeEventListener(DATA_CHANGED, refresh); document.removeEventListener('visibilitychange', refresh);
        };
      }
      return () => { listeners.delete(listener); if (!listeners.size) { stop?.(); stop = undefined; } };
    },
  };
}
const serverSnapshot = () => 0;
/** Visible screens catch up within 30 seconds; pending reviews use faster clocks. */
export function useDataRefresh(intervalMs = 30_000) {
  const clock = useMemo(() => {
    let clock = clocks.get(intervalMs);
    if (!clock) { clock = createClock(intervalMs); clocks.set(intervalMs, clock); }
    return clock;
  }, [intervalMs]);
  return useSyncExternalStore(clock.subscribe, clock.snapshot, serverSnapshot);
}
