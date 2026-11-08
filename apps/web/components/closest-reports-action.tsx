'use client';

import { trackMapDiscovery, reportDistanceBucket } from '@/lib/website-analytics';
import { useEffect, useRef, useState } from 'react';
import type { ClosestReport } from '@/lib/closest-report';
import styles from './map-empty-state.module.css';

export function ClosestReportsAction({ find, onShow, radius = 0 }: {
  find: (signal: AbortSignal) => Promise<ClosestReport | null>;
  onShow: (result: ClosestReport) => void;
  radius?: number;
}) {
  const [state, setState] = useState<'idle' | 'busy' | 'found' | 'empty' | 'error'>('idle');
  const [result, setResult] = useState<ClosestReport | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function search() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState('busy');
    trackMapDiscovery('closest_requested', { surface: 'closest_reports' });
    const timeout = window.setTimeout(() => { controller.abort(); setState('error'); trackMapDiscovery('closest_failed', { surface: 'closest_reports' }); }, 15000);
    controller.signal.addEventListener('abort', () => window.clearTimeout(timeout), { once: true });
    try {
      const match = await find(controller.signal);
      if (controller.signal.aborted) return;
      setResult(match); setState(match ? 'found' : 'empty');
      trackMapDiscovery(match ? 'closest_found' : 'closest_empty', { surface: 'closest_reports', ...(match ? { distance_bucket: reportDistanceBucket(match.miles) } : {}) });
    } catch {
      if (!controller.signal.aborted) { setState('error'); trackMapDiscovery('closest_failed', { surface: 'closest_reports' }); }
    } finally { window.clearTimeout(timeout); }
  }

  return <div className={styles.closest}>
    {state === 'found' && result ? <>
      <p role="status" className={styles.match}><strong>{result.miles < 1 ? 'Less than a mile away' : `${Math.round(result.miles).toLocaleString()} miles away`}</strong><span>{result.report.title || 'Litter report'}</span></p>
      {radius > 0 && <p className={styles.message}>Viewing this report removes your {radius}-mile distance limit.</p>}
      <button className={styles.primary} onClick={() => { trackMapDiscovery('closest_viewed', { surface: 'closest_reports', distance_bucket: reportDistanceBucket(result.miles) }); onShow(result); }}>View on map</button>
    </> : <>
      <button className={styles.primary} disabled={state === 'busy'} aria-busy={state === 'busy'} onClick={() => void search()}>{state === 'busy' ? 'Finding closest reports…' : state === 'error' ? 'Try closest reports again' : 'Find closest reports'}</button>
      {state === 'error' && <p className={styles.message} role="status">Reports could not load. Please try again.</p>}
      {state === 'empty' && <p className={styles.message} role="status">No matching reports found. Try another filter or location.</p>}
    </>}
  </div>;
}
