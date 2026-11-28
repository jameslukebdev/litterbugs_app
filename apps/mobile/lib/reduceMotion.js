import { AccessibilityInfo } from './safeAnimated';

// Whether the person asked the system to reduce motion. Read once and kept current,
// so animations can check it synchronously and skip themselves.
let reduced = false;
let started = false;

function start() {
  if (started) return;
  started = true;
  AccessibilityInfo?.isReduceMotionEnabled?.()?.then?.((value) => { reduced = Boolean(value); })?.catch?.(() => {});
  AccessibilityInfo?.addEventListener?.('reduceMotionChanged', (value) => { reduced = Boolean(value); });
}

export function prefersReducedMotion() {
  start();
  return reduced;
}
