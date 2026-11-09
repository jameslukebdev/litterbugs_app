'use client';
/* eslint-disable @next/next/no-img-element -- small bug artwork, like the map. */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { BUG_ART, clearFundBeforeCheckout, flyBug, peekFundBeforeCheckout, prefersReducedMotion, replayClass } from '@/lib/bug-motion';

/** An ant walks along the bottom of a loading card. Put it inside an element with `bug-ant-host`. */
export function AntWalk() {
  return <span className="bug-ant-walk" aria-hidden="true"><img src={BUG_ART.ant} alt="" width={22} height={22} /></span>;
}

/** A curious ladybug walks into an empty list and looks around. */
export function EmptyBug({ className = '' }: { className?: string }) {
  return <img className={`bug-empty-walker ${className}`} src={BUG_ART.ladybug} alt="" aria-hidden="true" width={36} height={36} />;
}

/**
 * True right after `value` changes into something `becomes` accepts for the same `key` (e.g. the same report
 * turning into a completed cleanup). Returns a counter so callers can key an element to replay its animation.
 */
export function useBecame<T>(key: string, value: T, becomes: (next: T, previous: T) => boolean) {
  const [seen, setSeen] = useState({ key, value, count: 0 });
  if (seen.key !== key || !Object.is(seen.value, value)) {
    const changed = seen.key === key && becomes(value, seen.value);
    setSeen({ key, value, count: changed ? seen.count + 1 : seen.count });
  }
  return seen.count;
}

/**
 * The cleanup fund's amount, counting up after a bee flies from the Fund button to `target` whenever the
 * fund grows while you watch, or when you come back from checkout with a bigger fund.
 */
export function useFundFlight(reportId: string, cents: number, target: RefObject<HTMLElement | null>) {
  const [shown, setShown] = useState(cents);
  const last = useRef<{ reportId: string; cents: number } | null>(null);
  useEffect(() => {
    const before = last.current;
    last.current = { reportId, cents };
    const grewHere = before && before.reportId === reportId && cents > before.cents;
    // Only read the saved pre-checkout amount here; it is cleared when the bee actually takes off.
    const from = grewHere ? before.cents : peekFundBeforeCheckout(reportId, cents);
    let frame = 0;
    if (from == null || prefersReducedMotion()) {
      if (from != null) clearFundBeforeCheckout(reportId);
      frame = requestAnimationFrame(() => setShown(cents));
      return () => cancelAnimationFrame(frame);
    }
    frame = requestAnimationFrame(() => setShown(from));
    const countUp = () => {
      replayClass(target.current, 'bug-fund-pop');
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, Math.max(0, (now - start) / 550));
        setShown(Math.round(from + (cents - from) * (1 - (1 - t) ** 3)));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };
    let cancelFlight: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      clearFundBeforeCheckout(reportId);
      const destination = target.current;
      const source = destination?.closest('.report-detail-layout')?.querySelector('.report-action-fund');
      if (source && destination) cancelFlight = flyBug(BUG_ART.bee, source, destination, countUp);
      else countUp();
    }, 350);
    return () => {
      window.clearTimeout(timer);
      cancelFlight?.();
      cancelAnimationFrame(frame);
    };
  }, [reportId, cents, target]);
  return shown;
}

/**
 * The current tab's underline glides from the tab you were on before, even when the tab opened a new page.
 * Render inside the tab row; `name` keeps separate rows from sharing a memory.
 */
export function SlidingUnderline({ name }: { name: string }) {
  const bar = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = bar.current;
    const row = el?.parentElement;
    if (!el || !row) return;
    const key = `litterbugs:tab-underline:${name}`;
    const place = (animate: boolean) => {
      const current = row.querySelector<HTMLElement>('[aria-current="page"]');
      if (!current) { el.style.opacity = '0'; return null; }
      const spot = { x: current.offsetLeft, y: current.offsetTop + current.offsetHeight - 3, w: current.offsetWidth };
      el.style.transition = animate ? '' : 'none';
      el.style.opacity = '1';
      el.style.transform = `translate(${spot.x}px, ${spot.y}px)`;
      el.style.width = `${spot.w}px`;
      return spot;
    };
    row.setAttribute('data-sliding-underline', '');
    let previous: { x: number; y: number; w: number } | null = null;
    try { previous = JSON.parse(window.sessionStorage.getItem(key) || 'null'); } catch { /* storage unavailable */ }
    let frame = 0;
    const save = (spot: ReturnType<typeof place>) => {
      try { if (spot) window.sessionStorage.setItem(key, JSON.stringify(spot)); } catch { /* storage unavailable */ }
    };
    if (previous && !prefersReducedMotion()) {
      el.style.transition = 'none';
      el.style.transform = `translate(${previous.x}px, ${previous.y ?? 0}px)`;
      el.style.width = `${previous.w}px`;
      void el.offsetWidth;
      frame = requestAnimationFrame(() => save(place(true)));
    } else {
      save(place(false));
    }
    const resize = () => save(place(false));
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); row.removeAttribute('data-sliding-underline'); };
  }, [name]);
  return <span ref={bar} className="bug-tab-underline" aria-hidden="true" />;
}
