'use client';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { observePhotoBatch } from '@/lib/photo-batch';
import { LoadingFirefly } from './loading-firefly';
import styles from './photo-batch.module.css';

export const photoBatchClass = styles.batch;

export function usePhotoBatch(ref: RefObject<HTMLElement | null>, enabled = true, revision?: unknown) {
  const [state, setState] = useState({ revision, busy: false });
  useEffect(() => {
    if (!enabled || !ref.current) return;
    return observePhotoBatch(ref.current, busy => setState(current => current.revision === revision && current.busy === busy ? current : { revision, busy }));
  }, [ref, enabled, revision]);
  return enabled && (state.revision !== revision || state.busy);
}

export function PhotoBatchFallback() {
  return <noscript><style>{'[data-batch-photo] { opacity: 1 !important; }'}</style></noscript>;
}

export function PhotoBatch({ children, className = '', showLoader = false }: { children: ReactNode; className?: string; showLoader?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const busy = usePhotoBatch(ref);
  return <div ref={ref} className={`${styles.batch} ${className}`}>
    {showLoader && <LoadingFirefly active={busy} label="Loading photos" />}
    {children}<PhotoBatchFallback />
  </div>;
}
