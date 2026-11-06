'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { HeaderAreaSearch } from '../header-area-search';
import Link from 'next/link';
import { AVAILABLE_CLEANUPS_MAP_HREF } from '@/lib/home-map-link';
import styles from './report-carousel.module.css';

export function ReportCarousel({ children, enabled, className }: { children: ReactNode; enabled: boolean; className: string }) {
  const [areaSearchOpen, setAreaSearchOpen] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const id = useId();
  const [edges, setEdges] = useState({ start: true, end: false });
  useEffect(() => {
    const node = track.current;
    if (!enabled || !node) return;
    const update = () => setEdges({ start: node.scrollLeft < 2, end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 2 });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    node.addEventListener('scroll', update, { passive: true });
    update();
    return () => { observer.disconnect(); node.removeEventListener('scroll', update); };
  }, [enabled, children]);
  if (!enabled) return <div className={className}>{children}</div>;
  function move(direction: number) {
    const node = track.current;
    if (!node) return;
    const card = node.firstElementChild?.getBoundingClientRect().width ?? node.clientWidth;
    node.scrollBy({ left: direction * (card + 22), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  return <section className={styles.carousel} aria-label="Reports needing a cleanup" aria-roledescription="carousel">
    <div className={styles.heading}>
      <h2>Reports needing a cleanup</h2>
      <div className={styles.controls}>
      <HeaderAreaSearch label="Find your area" open={areaSearchOpen} onOpenChange={setAreaSearchOpen} />
      <Link href={AVAILABLE_CLEANUPS_MAP_HREF}>See on map</Link>
      <button type="button" onClick={() => move(-1)} disabled={edges.start} aria-label="Previous reports" aria-controls={id}>←</button>
      <button type="button" onClick={() => move(1)} disabled={edges.end} aria-label="Next reports" aria-controls={id}>→</button>
      </div>
    </div>
    <div ref={track} id={id} className={`${className} ${styles.track}`} tabIndex={0} aria-label="Report cards; scroll to see more">{children}</div>
  </section>;
}
