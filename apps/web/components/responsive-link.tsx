'use client';

import Link from 'next/link';
import { useState, type ComponentProps } from 'react';
import { PendingLinkIndicator } from './pending-link-content';
import styles from './pending-link-content.module.css';

/** Warm a chosen destination without fetching every report on the page in full. */
export function ResponsiveLink({ children, className, prefetch, onMouseEnter, onFocus, onTouchStart, ...props }: ComponentProps<typeof Link>) {
  const [intent, setIntent] = useState(false);
  return <Link {...props} className={[styles.link, className].filter(Boolean).join(' ')} prefetch={intent ? true : prefetch}
    onMouseEnter={event => { onMouseEnter?.(event); if (!event.defaultPrevented) setIntent(true); }}
    onFocus={event => { onFocus?.(event); if (!event.defaultPrevented) setIntent(true); }}
    onTouchStart={event => { onTouchStart?.(event); if (!event.defaultPrevented) setIntent(true); }}>
    {children}<PendingLinkIndicator />
  </Link>;
}
