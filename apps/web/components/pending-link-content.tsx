'use client';
import { useLinkStatus } from 'next/link';
import type { ReactNode } from 'react';
import styles from './pending-link-content.module.css';

/** A slow or not-yet-prefetched route must still acknowledge the first click. */
export function PendingLinkContent({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return <span className={styles.content} data-pending={pending || undefined} aria-busy={pending || undefined}>{children}</span>;
}
