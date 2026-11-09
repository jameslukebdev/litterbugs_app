/**
 * Small bug animations that follow something happening (a pin landing, a fund growing, a report hidden).
 * Every helper does nothing when the visitor has asked for reduced motion, and leaves no element behind.
 */

export const BUG_ART = {
  ladybug: '/brand/bugs/ladybug.png',
  flower: '/brand/bugs/flower.png',
  bee: '/brand/bugs/bee.png',
  dragonfly: '/brand/ranks/dragonfly.svg',
  caterpillar: '/brand/ranks/caterpillar.svg',
  ant: '/brand/bugs/ant.svg',
  lightning: '/brand/ranks/lightning-bug.svg',
  cocoon: '/brand/ranks/cocoon.svg',
} as const;

export function prefersReducedMotion() {
  return typeof window === 'undefined' || typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const canAnimate = () => typeof document !== 'undefined' && typeof document.body?.animate === 'function';

function floatingBug(src: string, size: number) {
  const img = document.createElement('img');
  img.src = src; img.alt = ''; img.setAttribute('aria-hidden', 'true'); img.className = 'bug-flight';
  img.style.cssText = `position:fixed;left:0;top:0;width:${size}px;height:${size}px;z-index:2147483000;pointer-events:none;`;
  document.body.appendChild(img);
  return img;
}

const centre = (rect: DOMRect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

/** A bug flies on a gentle arc from one element to another, then calls `onArrive`. */
export function flyBug(src: string, from: Element, to: Element, onArrive?: () => void, size = 26) {
  if (prefersReducedMotion() || !canAnimate()) { onArrive?.(); return; }
  const a = centre(from.getBoundingClientRect());
  const b = centre(to.getBoundingClientRect());
  const lift = Math.max(60, Math.abs(a.y - b.y) * .4);
  const control = { x: (a.x + b.x) / 2 + 40, y: Math.min(a.y, b.y) - lift };
  const frames: Keyframe[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, u = 1 - t;
    const x = u * u * a.x + 2 * u * t * control.x + t * t * b.x - size / 2;
    const y = u * u * a.y + 2 * u * t * control.y + t * t * b.y - size / 2;
    frames.push({ transform: `translate(${x}px, ${y}px) scale(${t > .85 ? 1 - (t - .85) * 2.5 : 1 + Math.sin(t * Math.PI) * .15})`, opacity: t > .92 ? 0 : 1 });
  }
  const bug = floatingBug(src, size);
  const flight = bug.animate(frames, { duration: 1050, easing: 'cubic-bezier(.45, 0, .2, 1)' });
  flight.onfinish = () => { bug.remove(); onArrive?.(); };
  flight.oncancel = () => bug.remove();
  return () => {
    flight.onfinish = null;
    flight.cancel();
    bug.remove();
  };
}

/** The ladybug scurries off sideways from an element (used when a report is hidden). */
export function scurryFrom(from: Element) {
  if (prefersReducedMotion() || !canAnimate()) return;
  const r = from.getBoundingClientRect();
  const bug = floatingBug(BUG_ART.ladybug, 22);
  const run = bug.animate([
    { transform: `translate(${r.left + r.width / 2 - 11}px, ${r.top + r.height / 2 - 11}px) rotate(90deg)`, opacity: 1 },
    { transform: `translate(${r.left + r.width / 2 + 40}px, ${r.top + r.height / 2 - 14}px) rotate(90deg)`, opacity: 1, offset: .3 },
    { transform: `translate(${r.left + r.width / 2 + 80}px, ${r.top + r.height / 2 - 10}px) rotate(90deg)`, opacity: 1, offset: .55 },
    { transform: `translate(${r.left + r.width / 2 + 200}px, ${r.top + r.height / 2 - 13}px) rotate(90deg)`, opacity: 0 },
  ], { duration: 850, easing: 'cubic-bezier(.5, 0, .7, 1)' });
  run.onfinish = () => bug.remove();
  run.oncancel = () => bug.remove();
}

/** Replays a one-off CSS class (e.g. the favourite hop) on an element. */
export function replayClass(element: Element | null | undefined, className: string) {
  if (!element || prefersReducedMotion()) return;
  element.classList.remove(className);
  void (element as HTMLElement).offsetWidth;
  element.classList.add(className);
  element.addEventListener('animationend', () => element.classList.remove(className), { once: true });
}

/* Funding: remember the fund before checkout so the bee can fly when the report reopens with more money. */
const FUND_KEY = 'litterbugs:fund-flight:v1';
export function rememberFundBeforeCheckout(reportId: string, cents: number) {
  try { window.sessionStorage.setItem(FUND_KEY, JSON.stringify({ reportId, cents, at: Date.now() })); } catch { /* storage unavailable */ }
}
/** The fund amount from before checkout, if this report was just funded. Read-only; call `clearFundBeforeCheckout` once used. */
export function peekFundBeforeCheckout(reportId: string, currentCents: number): number | null {
  try {
    const raw = window.sessionStorage.getItem(FUND_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { reportId: string; cents: number; at: number };
    if (saved.reportId !== reportId || Date.now() - saved.at > 30 * 60_000 || !(currentCents > saved.cents)) return null;
    return saved.cents;
  } catch { return null; }
}
export function clearFundBeforeCheckout(reportId: string) {
  try {
    const raw = window.sessionStorage.getItem(FUND_KEY);
    if (raw && JSON.parse(raw).reportId === reportId) window.sessionStorage.removeItem(FUND_KEY);
  } catch { /* storage unavailable */ }
}
