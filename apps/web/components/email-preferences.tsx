'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FiCheck, FiMail } from 'react-icons/fi';
import type { WeeklyEmailPreference } from '@litterbugs/report-contract';
import { loadWeeklyEmailPreference, saveWeeklyEmailPreference } from '@/lib/weekly-email';
import styles from './email-preferences.module.css';

export function EmailPreferences() {
  const [preference, setPreference] = useState<WeeklyEmailPreference | null>(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const requestId = useRef(0);
  const saving = useRef(false);
  const load = useCallback(async () => {
    if (saving.current) return;
    const request = ++requestId.current;
    try {
      const value = await loadWeeklyEmailPreference();
      if (request !== requestId.current) return;
      setError(''); setPreference(value); setChecked(value.subscribed); setSaved(false);
    } catch { if (request === requestId.current) setError('Email preferences could not be loaded. Please try again.'); }
  }, []);
  useEffect(() => {
    // Fetch the persisted preference from the external service after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', refresh);
    // This ref is a request counter, not a DOM node; invalidate pending responses on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { requestId.current++; document.removeEventListener('visibilitychange', refresh); };
  }, [load]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preference || busy) return;
    const request = ++requestId.current;
    saving.current = true;
    setBusy(true); setError(''); setSaved(false);
    try {
      const value = await saveWeeklyEmailPreference(checked);
      if (request !== requestId.current) return;
      setPreference(value); setChecked(value.subscribed); setSaved(true);
    } catch { if (request === requestId.current) setError('Your email preference was not saved. Please try again.'); }
    finally { saving.current = false; if (request === requestId.current) setBusy(false); }
  }

  return <form className={styles.form} onSubmit={save} data-clarity-mask="true" data-ph-no-capture>
    <span className={styles.icon}><FiMail aria-hidden /></span>
    <h1>Email preferences</h1>
    {!preference ? <div className={styles.loading}>
      {error ? <><p role="alert">{error}</p><button type="button" className={styles.secondary} onClick={() => { void load(); }}>Try again</button></> : <p role="status">Loading email preferences…</p>}
    </div> : <>
      <div className={styles.box}>
        <div className={styles.row}><label htmlFor="weekly-email"><strong>Litterbugs emails</strong></label>
          <input className={styles.switch} id="weekly-email" type="checkbox" role="switch" checked={checked} disabled={busy} onChange={e => { setChecked(e.target.checked); setSaved(false); }} /></div>
      </div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button type="submit" className={styles.primary} disabled={busy || checked === preference.subscribed}>{busy ? 'Saving…' : 'Save preferences'}</button>
      {saved ? <p className={styles.success} role="status"><FiCheck aria-hidden />Saved</p> : null}
    </>}
  </form>;
}
