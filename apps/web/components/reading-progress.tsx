'use client';
/* eslint-disable @next/next/no-img-element -- small caterpillar, like the map's bugs. */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Long reading pages: a thin line along the bottom of the sticky header fills as you read, with a caterpillar
 * crawling at its tip while you scroll. Only appears on pages at least two screens long.
 */
export function ReadingProgress() {
  const [header, setHeader] = useState<HTMLElement | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setHeader(document.querySelector<HTMLElement>('header[data-site-header]')));
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const el = bar.current;
    if (!header || !el) return;
    let frame = 0;
    let stopTimer = 0;
    const measure = () => {
      frame = 0;
      const room = document.documentElement.scrollHeight - window.innerHeight;
      const long = document.documentElement.scrollHeight >= window.innerHeight * 2;
      el.hidden = !long;
      const read = room > 0 ? Math.min(1, Math.max(0, window.scrollY / room)) : 0;
      el.style.setProperty('--read', read.toFixed(4));
      el.toggleAttribute('data-started', read > 0.002);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
      el.setAttribute('data-crawling', '');
      window.clearTimeout(stopTimer);
      stopTimer = window.setTimeout(() => el.removeAttribute('data-crawling'), 180);
    };
    measure();
    const observer = new ResizeObserver(() => { if (!frame) frame = requestAnimationFrame(measure); });
    observer.observe(document.body);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame); window.clearTimeout(stopTimer);
      window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll);
    };
  }, [header]);
  if (!header) return null;
  return createPortal(
    <div ref={bar} className="reading-progress" aria-hidden="true" hidden>
      <span className="reading-progress-fill" />
      <img className="reading-progress-bug" src="/brand/ranks/caterpillar.svg" alt="" width={26} height={20} />
    </div>,
    header,
  );
}
