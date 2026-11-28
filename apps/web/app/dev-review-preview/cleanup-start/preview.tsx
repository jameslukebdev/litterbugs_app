'use client';

import { useState } from 'react';
import { CleanupSafetyPanel } from '@/components/cleanup-start-panel';
import styles from '@/components/cleanup-start-panel.module.css';
import { ModalShell } from '@/components/modal-shell';
import { CLEANUP_ACKNOWLEDGMENT, CLEANUP_RELEASE, CLEANUP_SAFETY_GUIDELINES } from '@/lib/cleanup-safety-document';

export function CleanupStartPreview() {
  const [open, setOpen] = useState(true);
  const [returning, setReturning] = useState(false);
  const [paid, setPaid] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [site, setSite] = useState(false);
  const [complete, setComplete] = useState(false);
  function show() { setAccepted(false); setSite(false); setComplete(false); setOpen(true); }
  return <main style={{ maxWidth: 620, margin: '40px auto', padding: 24 }}>
    <h1>Cleanup start preview</h1>
    <p>Try the first-time agreement and returning-cleaner safety check. This preview does not claim a report or save acceptance.</p>
    <div style={{ display: 'grid', gap: 16, marginBlock: 24 }}>
      <label><input type="checkbox" checked={returning} onChange={event => setReturning(event.target.checked)} /> Agreement already accepted</label>
      <label><input type="checkbox" checked={paid} onChange={event => setPaid(event.target.checked)} /> Funded cleanup ($1.00)</label>
      <button className={styles.start} onClick={show}>Preview cleanup start</button>
    </div>
    {complete && <p role="status">Preview complete. No cleanup was claimed.</p>}
    {open && <ModalShell label="Cleanup safety and funded reward acknowledgment" onClose={() => setOpen(false)} className={styles.dialog}>
      <CleanupSafetyPanel agreementSaved={returning} rewardCents={paid ? 100 : 0}
        waiver={{ body: CLEANUP_ACKNOWLEDGMENT, guidelines_body: CLEANUP_SAFETY_GUIDELINES, release_body: CLEANUP_RELEASE, published_at: '2026-10-02T00:00:00Z' }}
        waiverAccepted={accepted} onWaiverAccepted={setAccepted} siteConfirmed={site} onSiteConfirmed={setSite}
        busy={false} disabled={false} onClaim={() => { setComplete(true); setOpen(false); }} />
    </ModalShell>}
  </main>;
}
