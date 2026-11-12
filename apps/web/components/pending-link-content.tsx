'use client';
import { useLinkStatus } from 'next/link';
import type { ReactNode } from 'react';

/** A slow or not-yet-prefetched route must still acknowledge the first click. */
export function PendingLinkContent({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return <span style={{ display: 'inline-grid' }} aria-busy={pending || undefined}>
    <span style={{ gridArea: '1 / 1', visibility: pending ? 'hidden' : undefined }} aria-hidden={pending || undefined}>{children}</span>
    {pending && <span style={{ gridArea: '1 / 1' }} role="status">Opening…</span>}
  </span>;
}
