'use client';
/* eslint-disable @next/next/no-img-element -- small heading bug, like the map's bugs. */

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { HeaderAreaSearch } from '../header-area-search';
import { ResponsiveLink as Link } from '../responsive-link';
import { AVAILABLE_CLEANUPS_MAP_HREF } from '@/lib/home-map-link';
import styles from './report-carousel.module.css';
import { photoBatchClass, PhotoBatchFallback, usePhotoBatch } from '../photo-batch';

export function ReportCarousel({ children, enabled, className }: { children: ReactNode; enabled: boolean; className: string }) {
  const [areaSearchOpen, setAreaSearchOpen] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const scrollTarget = useRef<number | null>(null);
  usePhotoBatch(track);
  const cocoon = useRef<HTMLImageElement>(null);
  const id = useId();
  const [edges, setEdges] = useState({ start: true, end: false });
  useEffect(() => {
    const bug = cocoon.current;
    if (!enabled || !bug) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      bug.classList.add('bug-wiggle-arrival');
      observer.disconnect();
    });
    observer.observe(bug);
    return () => observer.disconnect();
  }, [enabled]);
  useEffect(() => {
    const node = track.current;
    if (!enabled || !node) return;
    const update = () => setEdges({ start: node.scrollLeft < 2, end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 2 });
    const resetTarget = () => { scrollTarget.current = null; };
    const observer = new ResizeObserver(() => { resetTarget(); update(); });
    observer.observe(node);
    node.addEventListener('scroll', update, { passive: true });
    for (const event of ['scrollend', 'pointerdown', 'wheel', 'keydown']) node.addEventListener(event, resetTarget, { passive: true });
    resetTarget();
    update();
    return () => {
      observer.disconnect(); node.removeEventListener('scroll', update);
      for (const event of ['scrollend', 'pointerdown', 'wheel', 'keydown']) node.removeEventListener(event, resetTarget);
    };
  }, [enabled, children]);
  if (!enabled) return <div ref={track} className={`${className} ${photoBatchClass}`}>{children}<PhotoBatchFallback /></div>;
  function move(direction: number) {
    const node = track.current;
    if (!node) return;
    const card = node.firstElementChild?.getBoundingClientRect().width ?? node.clientWidth;
    // Continue from the requested destination, even while the previous scroll is moving.
    const left = Math.max(0, Math.min(node.scrollWidth - node.clientWidth, (scrollTarget.current ?? node.scrollLeft) + direction * (card + 22)));
    scrollTarget.current = left;
    node.scrollTo({ left, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  return <section className={styles.carousel} aria-label="Reports needing a cleanup" aria-roledescription="carousel">
    <div className={styles.heading}>
      <h2 className="heading-with-bug"><img ref={cocoon} className="heading-bug bug-wiggle" src="/brand/ranks/cocoon.svg" alt="" aria-hidden="true" width={32} height={32} />Reports needing a cleanup</h2>
      <div className={styles.controls}>
      <HeaderAreaSearch label="Find your area" open={areaSearchOpen} onOpenChange={setAreaSearchOpen} />
      <Link href={AVAILABLE_CLEANUPS_MAP_HREF}>See on map</Link>
      <button type="button" onClick={() => move(-1)} disabled={edges.start} aria-label="Previous reports" aria-controls={id}>←</button>
      <button type="button" onClick={() => move(1)} disabled={edges.end} aria-label="Next reports" aria-controls={id}>→</button>
      </div>
    </div>
    <div ref={track} id={id} className={`${className} ${styles.track} ${photoBatchClass}`} tabIndex={0} aria-label="Report cards; scroll to see more">{children}<PhotoBatchFallback /></div>
  </section>;
}
