'use client';

import Image from 'next/image';
import { useEffect, useRef, type ReactNode } from 'react';
import { trackMapDiscovery } from '@/lib/website-analytics';
import styles from './map-empty-state.module.css';

const VISIBLE_HEADING_RATIO = 0.5;

export function MapEmptyState({ error, filtered, closestAction, onRetry, onFilters }: {
  error?: string;
  filtered: boolean;
  closestAction?: ReactNode;
  onRetry: () => void;
  onFilters: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const seen = useRef(false);
  const empty = !error;

  useEffect(() => {
    if (!empty) {
      seen.current = false;
      return;
    }
    if (seen.current || !heading.current || typeof IntersectionObserver === 'undefined') return;

    let inView = false;
    let disposed = false;
    function recordImpression() {
      if (disposed || seen.current || !inView || document.visibilityState !== 'visible') return;
      seen.current = true;
      observer.disconnect();
      trackMapDiscovery('empty_state_seen', { surface: 'map', filtered });
    }
    const observer = new IntersectionObserver(entries => {
      const entry = entries.at(-1);
      inView = Boolean(entry?.isIntersecting && entry.intersectionRatio >= VISIBLE_HEADING_RATIO);
      recordImpression();
    }, { threshold: VISIBLE_HEADING_RATIO });

    observer.observe(heading.current);
    document.addEventListener('visibilitychange', recordImpression);
    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener('visibilitychange', recordImpression);
    };
  }, [empty, filtered]);

  return <section className={styles.strip} aria-label={error ? 'Map report loading error' : 'No reports on map'}>
    <div className={styles.title} role="status">
      <Image src="/brand/ranks/caterpillar.svg" width={40} height={40} alt="" />
      <h2 ref={heading}>{error ? 'Reports could not be loaded' : filtered ? 'No reports match your filters here' : 'No reports in this map area'}</h2>
    </div>
    {error ? <button className={styles.secondary} onClick={onRetry}>Try again</button> : <>
      {closestAction}
      {filtered && <button className={styles.secondary} onClick={onFilters}>Adjust filters</button>}
    </>}
  </section>;
}
