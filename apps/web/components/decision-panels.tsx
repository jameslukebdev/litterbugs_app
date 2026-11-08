'use client';
import { useId, useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import styles from './decision-panels.module.css';

/** Class for the button that opens one of these confirmations (white, red outline). */
export const dangerTriggerClass = styles.trigger;

/**
 * On-page confirmations for permanent actions (no browser pop-ups): say exactly what happens,
 * then offer a safe way out next to the destructive button.
 */
export function DeleteReportConfirm({ busy, error, onCancel, onConfirm }: { busy: boolean; error?: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className={styles.panel} role="group" aria-label="Confirm deleting this report">
      <h3>Delete this report?</h3>
      <p>It comes off the map for everyone, and its photos are deleted. This can’t be undone.</p>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <div className={styles.buttons}>
        <button type="button" className={styles.cancel} onClick={onCancel} disabled={busy}>Keep it</button>
        <button type="button" className={styles.danger} onClick={onConfirm} disabled={busy}>{busy ? 'Deleting…' : 'Delete report'}</button>
      </div>
    </div>
  );
}

export function DeleteAccountPanel({ busy, error, onCancel, onConfirm }: { busy: boolean; error?: string; onCancel: () => void; onConfirm: () => void }) {
  const [typed, setTyped] = useState('');
  const inputId = useId();
  const ready = typed.trim().toUpperCase() === 'DELETE';
  return (
    <section className={`${styles.panel} ${styles.account}`} aria-labelledby={`${inputId}-title`}>
      <h3 id={`${inputId}-title`}>Delete your account?</h3>
      <p className={styles.warning}><FiAlertTriangle aria-hidden="true" />This is permanent. It can’t be undone.</p>
      <div className={styles.lists}>
        <div>
          <h4>What’s deleted</h4>
          <ul>
            <li>Your profile and sign-in</li>
            <li>Photos you uploaded</li>
          </ul>
        </div>
        <div>
          <h4>What stays, without your name</h4>
          <ul>
            <li>Your reports on the map: where, what kind of litter, priority, status and dates</li>
          </ul>
        </div>
      </div>
      <label className={styles.typed} htmlFor={inputId}>
        <span>Type <b>DELETE</b> to confirm</span>
        <input id={inputId} value={typed} onChange={event => setTyped(event.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={busy} />
      </label>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <div className={styles.buttons}>
        <button type="button" className={styles.cancel} onClick={onCancel} disabled={busy}>Keep my account</button>
        <button type="button" className={styles.danger} onClick={onConfirm} disabled={!ready || busy}>{busy ? 'Deleting…' : 'Delete account'}</button>
      </div>
    </section>
  );
}

/** Shown when the account is gone but this browser couldn't clear its saved photos. */
export function AccountDeletedNotice({ onDone }: { onDone: () => void }) {
  return (
    <section className={styles.panel} role="status">
      <h3>Your account is deleted</h3>
      <p>This browser couldn’t remove the report photos it saved. To remove them, clear site data for litterbugs.app in your browser settings.</p>
      <div className={styles.buttons}><button type="button" className={styles.cancel} onClick={onDone}>Done</button></div>
    </section>
  );
}
