'use client';
/* eslint-disable @next/next/no-img-element -- Small existing SVG brand artwork. */
import { useEffect, useState } from 'react';
import styles from './loading-firefly.module.css';

/** Keep mounted as `active` changes so CSS can cancel fast loads and fade out. */
export function LoadingFirefly({ active, label = 'Loading reports' }: { active: boolean; label?: string }) {
  const [cycle, setCycle] = useState({ active, shown: false });
  // Reset each loading cycle before paint, including very rapid retries. The
  // initial/server render is hidden too; CSS transitions alone don't delay it.
  if (cycle.active !== active) setCycle({ active, shown: false });
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setCycle(current => current.active ? { active: true, shown: true } : current), 350);
    return () => clearTimeout(timer);
  }, [active]);
  const visible = active && cycle.active && cycle.shown;
  return <span className={styles.indicator} data-visible={visible || undefined}
    role={active ? 'status' : undefined} aria-label={active ? label : undefined} aria-hidden={!active || undefined}>
    <span className={styles.bug} aria-hidden="true">
      <img src="/brand/ranks/lightning-bug.svg" width={56} height={56} alt="" draggable={false} />
    </span>
  </span>;
}
