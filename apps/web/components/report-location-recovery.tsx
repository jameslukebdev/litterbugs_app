'use client';

import { useId } from 'react';
import type { LocationReason } from '@/lib/report-location-error';
import styles from './report-location-recovery.module.css';

export function ReportLocationRecovery({ reason, busy, onRetry, onDismiss }: { reason: LocationReason; busy: boolean; onRetry: () => void; onDismiss: () => void }) {
  const title = useId();
  const denied = reason === 'location_denied';
  const outOfRange = reason === 'location_out_of_range';
  return <section className={styles.recovery} aria-labelledby={title} aria-busy={busy}>
    <h3 id={title}>{denied ? 'Allow location to confirm your spot.' : outOfRange ? 'Choose a nearby report location.' : 'We couldn’t check your location.'}</h3>
    <p role="alert">{denied ? 'Your report pin and answers are kept. Allow location access in your browser, then try again.' : outOfRange ? 'Reports must be within 50 miles of your current location. Your pin and answers are kept; move the pin closer or try again when you’re nearby.' : 'Your report pin and answers are kept. Move somewhere with a clearer GPS signal, then try again.'}</p>
    {!outOfRange && <details className={styles.help} open={denied || undefined}>
      <summary>How to allow location</summary>
      <p>Open this browser’s site controls beside the address bar, find Location or Permissions, and allow location for Litterbugs. On a phone, also check that Location Services are turned on for your browser. Return here and try again.</p>
    </details>}
    <div className={styles.actions}>
      <button type="button" className={`primary-button ${styles.retry}`} disabled={busy} onClick={onRetry}>{busy ? 'Checking your location…' : 'Try again'}</button>
      <button type="button" className="secondary-button" disabled={busy} onClick={onDismiss}>Back to report</button>
    </div>
  </section>;
}
