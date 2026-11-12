'use client';

import { useEffect, useRef, useState } from 'react';
import { scurryFrom } from '@/lib/bug-motion';
import { createClient } from '@/lib/supabase/client';
import { reportPreferenceSync } from '@/lib/synced-report-preferences';

/** Uses the same Hide/Unhide preferences as the map's existing card menu. */
export function ReportCardOptions({ reportId, title }: { reportId: string; title: string }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const change = useRef(0);
  useEffect(() => {
    let active = true;
    void createClient().auth.getUser().then(async ({ data }) => {
      const value = await reportPreferenceSync.load(data.user?.id ?? 'guest');
      if (active) setHidden(value.preferences.hidden.includes(reportId));
    }).catch(() => {});
    return () => { active = false; };
  }, [reportId]);

  async function toggleHidden() {
    if (busy) return;
    const revision = ++change.current;
    setBusy(true);
    try {
      const { data } = await createClient().auth.getUser();
      const owner = data.user?.id ?? 'guest';
      const value = await reportPreferenceSync.set(owner, 'hidden', reportId, !hidden);
      const isHidden = value.preferences.hidden.includes(reportId);
      setHidden(isHidden);
      const card = menu.current?.closest('article');
      if (!hidden && isHidden && card) scurryFrom(card);
      setMessage(hidden ? 'Report restored to map results.' : 'Report hidden from map results. You can undo this here.');
      // The device save is complete; undo must remain available while cloud sync runs.
      setBusy(false);
      const synced = await reportPreferenceSync.sync(owner);
      if (revision === change.current && synced.offline) setMessage('Saved on this device. Changes will sync when you reconnect.');
    } catch {
      if (revision === change.current) setMessage('Your preference could not be synced. Please try again.');
    } finally {
      if (revision === change.current) setBusy(false);
    }
  }

  return <details className="card-options public-card-options" ref={menu} onKeyDown={event => {
    if (event.key === 'Escape' && menu.current) {
      menu.current.open = false;
      menu.current.querySelector('summary')?.focus();
    }
  }}>
    <summary aria-label={`Options for ${title}`}>•••</summary>
    <div className="public-card-options-panel">
      <button disabled={busy} aria-busy={busy || undefined} onClick={toggleHidden}>{hidden ? 'Unhide report' : 'Hide report'}</button>
      {message && <p role="status">{message}</p>}
    </div>
  </details>;
}
