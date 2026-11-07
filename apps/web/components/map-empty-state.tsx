'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import styles from './map-empty-state.module.css';

export function MapEmptyState({ error, filtered, closestAction, onRetry, onFilters }: {
  error?: string;
  filtered: boolean;
  closestAction?: ReactNode;
  onRetry: () => void;
  onFilters: () => void;
}) {
  return <section className={styles.strip} aria-label={error ? 'Map report loading error' : 'No reports on map'}>
    <div className={styles.title} role="status">
      <Image src="/brand/ranks/caterpillar.svg" width={40} height={40} alt="" />
      <h2>{error ? 'Reports could not be loaded' : filtered ? 'No reports match your filters here' : 'No reports in this map area'}</h2>
    </div>
    {error ? <button className={styles.secondary} onClick={onRetry}>Try again</button> : <>
      {closestAction}
      {filtered && <button className={styles.secondary} onClick={onFilters}>Adjust filters</button>}
    </>}
  </section>;
}
