'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { FiCheck, FiFlag, FiSlash } from 'react-icons/fi';
import { createClient } from '@/lib/supabase/client';
import { realUserId } from '@/lib/report-access';
import styles from './member-safety-actions.module.css';

export const MEMBER_REPORT_REASONS = [
  ['spam_or_misleading', 'Spam or misleading'], ['harassment_or_hate', 'Harassment or hate'],
  ['inappropriate_content', 'Inappropriate content'], ['impersonation', 'Pretending to be someone else'],
  ['safety_concern', 'Safety concern'], ['other', 'Something else'],
] as const;
export type MemberReportReason = typeof MEMBER_REPORT_REASONS[number][0];
export type SafetyMode = 'idle' | 'report' | 'block' | 'reported';

/**
 * Report or block another member. Each choice opens on the page (no browser pop-ups) and says
 * plainly what happens next, because these are rare, careful decisions.
 */
export function MemberSafetyPanel({
  name, mode, onMode, reason, onReason, details, onDetails, busy, error, onReport, onBlock,
}: {
  name: string;
  mode: SafetyMode;
  onMode: (mode: SafetyMode) => void;
  reason: MemberReportReason | '';
  onReason: (reason: MemberReportReason) => void;
  details: string;
  onDetails: (details: string) => void;
  busy: '' | 'report' | 'block';
  error: string;
  onReport: () => void;
  onBlock: () => void;
}) {
  const needsDetails = reason === 'other';
  const canSend = Boolean(reason) && (!needsDetails || Boolean(details.trim()));
  function submit(event: FormEvent) {
    event.preventDefault();
    if (canSend && !busy) onReport();
  }

  return (
    <section className={styles.root} aria-label={`Report or block ${name}`}>
      {mode === 'idle' ? (
        <div className={styles.actions}>
          <button type="button" className={styles.report} onClick={() => onMode('report')}><FiFlag aria-hidden="true" />Report</button>
          <button type="button" className={styles.block} onClick={() => onMode('block')}><FiSlash aria-hidden="true" />Block</button>
        </div>
      ) : null}

      {mode === 'report' ? (
        <form className={styles.panel} onSubmit={submit}>
          <h3>Why are you reporting {name}?</h3>
          <fieldset className={styles.reasons} disabled={Boolean(busy)}>
            <legend className={styles.srOnly}>Reason</legend>
            {MEMBER_REPORT_REASONS.map(([value, label]) => (
              <label key={value} className={styles.reason}>
                <input type="radio" name="member-report-reason" value={value} checked={reason === value} onChange={() => onReason(value)} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          {reason === 'safety_concern' ? <p className={styles.urgent}>If anyone is in danger right now, call 911 first.</p> : null}
          <label className={styles.details}>
            <span>{needsDetails ? 'What happened?' : 'Anything else we should know? (optional)'}</span>
            <textarea maxLength={2000} value={details} onChange={event => onDetails(event.target.value)} disabled={Boolean(busy)} required={needsDetails} />
          </label>
          <p className={styles.note}>Only the Litterbugs team sees reports. {name} won’t be told who sent it.</p>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <div className={styles.buttons}>
            <button type="button" className={styles.cancel} onClick={() => onMode('idle')} disabled={Boolean(busy)}>Cancel</button>
            <button type="submit" className={styles.send} disabled={!canSend || Boolean(busy)}>{busy === 'report' ? 'Sending…' : 'Send report'}</button>
          </div>
        </form>
      ) : null}

      {mode === 'block' ? (
        <div className={styles.panel} role="group" aria-label={`Confirm blocking ${name}`}>
          <h3>Block {name}?</h3>
          <ul className={styles.facts}>
            <li>You won’t see their profile or reports while you’re signed in.</li>
            <li>They won’t be told.</li>
            <li>You can unblock them anytime in your account settings, under Blocked accounts.</li>
          </ul>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <div className={styles.buttons}>
            <button type="button" className={styles.cancel} onClick={() => onMode('idle')} disabled={Boolean(busy)}>Cancel</button>
            <button type="button" className={styles.confirmBlock} onClick={onBlock} disabled={Boolean(busy)}>{busy === 'block' ? 'Blocking…' : 'Yes, block'}</button>
          </div>
        </div>
      ) : null}

      {mode === 'reported' ? (
        <div className={styles.done} role="status">
          <FiCheck aria-hidden="true" />
          <div><strong>Report sent</strong><p>Our team will review it. {name} won’t know it was you.</p></div>
        </div>
      ) : null}
      {mode === 'reported' ? (
        <div className={styles.actions}>
          <button type="button" className={styles.block} onClick={() => onMode('block')}><FiSlash aria-hidden="true" />Block them too</button>
        </div>
      ) : null}
    </section>
  );
}

export function MemberSafetyActions({ profileId, memberName, sourceReportId, onBlocked }: { profileId: string; memberName?: string | null; sourceReportId?: string; onBlocked: () => void }) {
  const [viewer, setViewer] = useState<string | null>(null);
  const [mode, setMode] = useState<SafetyMode>('idle');
  const [reason, setReason] = useState<MemberReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState<'' | 'report' | 'block'>('');
  const [error, setError] = useState('');
  useEffect(() => { let cancelled = false; void createClient().auth.getUser().then(({ data }) => { if (!cancelled) setViewer(realUserId(data.user)); }); return () => { cancelled = true; }; }, []);
  if (!viewer || viewer === profileId) return null;
  const name = memberName?.trim() || 'this member';

  async function block() {
    if (busy) return;
    setBusy('block'); setError('');
    try {
      const { error: blockError } = await createClient().from('user_blocks').insert({ blocker_id: viewer!, blocked_id: profileId });
      if (blockError && blockError.code !== '23505') throw blockError;
      onBlocked();
    } catch { setError('Couldn’t block them. Check your connection and try again.'); }
    finally { setBusy(''); }
  }
  async function report() {
    if (busy || !reason || (reason === 'other' && !details.trim())) return;
    setBusy('report'); setError('');
    try {
      const { error: reportError } = await createClient().from('user_moderation_reports').insert({ reporter_id: viewer!, reported_user_id: profileId, source_report_id: sourceReportId ?? null, reason, details: details.trim() || null });
      if (reportError) throw reportError;
      setMode('reported');
    } catch { setError('Couldn’t send your report. Check your connection and try again.'); }
    finally { setBusy(''); }
  }

  return <MemberSafetyPanel name={name} mode={mode} onMode={next => { setMode(next); setError(''); }} reason={reason} onReason={setReason}
    details={details} onDetails={setDetails} busy={busy} error={error} onReport={() => { void report(); }} onBlock={() => { void block(); }} />;
}
