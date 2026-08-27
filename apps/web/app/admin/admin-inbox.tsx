'use client';

import { useEffect, useMemo, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

import styles from './admin.module.css';

type AdminCase = {
  id: string;
  case_type: string;
  status: string;
  priority: number;
  title: string;
  summary: string | null;
  report_id: string | null;
  cleanup_attempt_id: string | null;
  created_at: string;
  report_title: string | null;
  reward_amount_cents: number | null;
  review_due_at: string | null;
};

type CaseDetail = {
  case: AdminCase & { context?: Record<string, unknown> };
  report: { title?: string | null; severity?: string | null; funding_eligibility?: string } | null;
  attempt: { reward_amount_cents?: number; financial_review_summary?: string | null; financial_review_status?: string; dispute_reason?: string | null; dispute_status?: string; first_paid_cleanup?: boolean; payout_status?: string } | null;
  contribution: { principal_amount_cents?: number; platform_fee_cents?: number; total_amount_cents?: number; status?: string; failure_code?: string | null } | null;
  cleaner_history: { completed_cleanups?: number; paid_rewards_sent?: number } | null;
  submissions: Array<{ id: string; description: string; submission_number: number; created_at: string }>;
  ai_checks: Array<{ id: string; status: string; user_summary: string | null; reason_codes: string[]; created_at: string }>;
  actions: Array<{ id: string; action: string; reason: string; created_at: string }>;
  photos?: { before?: string[]; after?: string[] };
};

const labels: Record<string, string> = {
  report_safety: 'Report safety',
  gemini_review: 'Photo review',
  first_paid_cleanup: 'First paid cleanup',
  dispute: 'Reporter dispute',
  refund_failure: 'Refund failure',
  payout_failure: 'Payout failure',
};

const actions: Record<string, Array<{ value: string; label: string; destructive?: boolean }>> = {
  report_safety: [
    { value: 'approve_funding', label: 'Clear for funding' },
    { value: 'reject_funding', label: 'Keep funding blocked', destructive: true },
    { value: 'close_and_refund', label: 'Close report & refund', destructive: true },
  ],
  gemini_review: [
    { value: 'approve_cleanup', label: 'Accept evidence' },
    { value: 'request_better_photos', label: 'Request better photos' },
    { value: 'reject_cleanup', label: 'Reject cleanup', destructive: true },
    { value: 'reject_and_close', label: 'Reject, close & refund', destructive: true },
  ],
  first_paid_cleanup: [
    { value: 'approve_cleanup', label: 'Clear first payout' },
    { value: 'reject_cleanup', label: 'Reject cleanup', destructive: true },
    { value: 'reject_and_close', label: 'Reject, close & refund', destructive: true },
  ],
  dispute: [
    { value: 'deny_dispute', label: 'Deny dispute' },
    { value: 'uphold_dispute', label: 'Uphold dispute', destructive: true },
    { value: 'reject_and_close', label: 'Uphold, close & refund', destructive: true },
  ],
  refund_failure: [{ value: 'retry_refund', label: 'Retry refund' }],
  payout_failure: [{ value: 'retry_payout', label: 'Retry payout' }],
};

const money = (cents = 0) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);

async function invokeAdmin(body: Record<string, unknown>) {
  const { data, error } = await createClient().functions.invoke('admin-cleanup-case', { body });
  if (error || data?.error) throw new Error(data?.error || error?.message || 'Admin request failed');
  return data;
}

export function AdminInbox() {
  const [cases, setCases] = useState<AdminCase[]>([]);
  const [status, setStatus] = useState<'open' | 'resolved'>('open');
  const [type, setType] = useState('all');
  const [selected, setSelected] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    void invokeAdmin({ operation: 'list', status })
      .then((data) => {
        if (active) setCases(Array.isArray(data.cases) ? data.cases : []);
      })
      .catch((error) => {
        if (active) setMessage(error instanceof Error ? error.message : 'Inbox unavailable');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [status]);

  const visibleCases = useMemo(
    () => cases.filter((item) => type === 'all' || item.case_type === type),
    [cases, type],
  );

  async function openCase(item: AdminCase) {
    setDetailLoading(true);
    setMessage('');
    try {
      setSelected(await invokeAdmin({ operation: 'get', caseId: item.id }) as CaseDetail);
      setReason('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Case unavailable');
    } finally { setDetailLoading(false); }
  }

  async function resolve(action: { value: string; label: string; destructive?: boolean }) {
    if (!selected || reason.trim().length < 3) return setMessage('Add a short decision reason first.');
    if (!window.confirm(`${action.label}? This decision is recorded in the audit history.`)) return;
    setBusy(action.value);
    setMessage('');
    try {
      const detail = await invokeAdmin({
        operation: 'resolve',
        caseId: selected.case.id,
        action: action.value,
        reason: reason.trim(),
      });
      setSelected(detail as CaseDetail);
      const refreshed = await invokeAdmin({ operation: 'list', status });
      setCases(Array.isArray(refreshed.cases) ? refreshed.cases : []);
      setMessage('Decision recorded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Decision failed');
    } finally { setBusy(''); }
  }

  return (
    <div className={styles.workspace}>
      <section className={styles.inbox}>
        <div className={styles.filters}>
          <div className={styles.segmented}>
            <button className={status === 'open' ? styles.activeFilter : ''} onClick={() => { setLoading(true); setStatus('open'); }}>Open</button>
            <button className={status === 'resolved' ? styles.activeFilter : ''} onClick={() => { setLoading(true); setStatus('resolved'); }}>Resolved</button>
          </div>
          <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter case type">
            <option value="all">All review types</option>
            {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        {loading ? <p className={styles.empty}>Loading inbox…</p> : null}
        {!loading && visibleCases.length === 0 ? <p className={styles.empty}>No cases match this view.</p> : null}
        <div className={styles.caseList}>
          {visibleCases.map((item) => (
            <button key={item.id} className={`${styles.caseRow} ${selected?.case.id === item.id ? styles.selectedCase : ''}`} onClick={() => void openCase(item)}>
              <span className={styles.caseTopline}><span className={styles.caseType}>{labels[item.case_type] || item.case_type}</span><span className={styles.priority}>P{item.priority}</span></span>
              <strong>{item.report_title || item.title}</strong>
              <span>{item.summary || 'Open this case for details.'}</span>
              <time>{new Date(item.created_at).toLocaleString()}</time>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.detail}>
        {detailLoading ? <p className={styles.empty}>Loading case…</p> : null}
        {!detailLoading && !selected ? <p className={styles.empty}>Select a case to review its evidence and actions.</p> : null}
        {selected ? (
          <>
            <div className={styles.detailHeading}>
              <span className={styles.caseType}>{labels[selected.case.case_type] || selected.case.case_type}</span>
              <h2>{selected.report?.title || selected.case.title}</h2>
              <p>{selected.case.summary}</p>
            </div>

            {selected.attempt?.reward_amount_cents ? (
              <div className={styles.reward}>Cleaner reward <strong>{money(selected.attempt.reward_amount_cents)}</strong></div>
            ) : null}

            {selected.attempt ? (
              <div className={styles.summaryCard}>
                <h3>Payment state</h3>
                <p>Evidence: {(selected.attempt.financial_review_status ?? 'unknown').replaceAll('_', ' ')} · Dispute: {(selected.attempt.dispute_status ?? 'none').replaceAll('_', ' ')} · Payout: {(selected.attempt.payout_status ?? 'not applicable').replaceAll('_', ' ')}</p>
              </div>
            ) : null}

            {selected.contribution ? (
              <div className={styles.summaryCard}>
                <h3>Contribution state</h3>
                <p>{money(selected.contribution.principal_amount_cents)} fund + {money(selected.contribution.platform_fee_cents)} fee · {(selected.contribution.status ?? 'unknown').replaceAll('_', ' ')}</p>
                {selected.contribution.failure_code ? <p>{selected.contribution.failure_code}</p> : null}
              </div>
            ) : null}

            {selected.cleaner_history ? (
              <div className={styles.summaryCard}>
                <h3>Cleaner history</h3>
                <p>{selected.cleaner_history.completed_cleanups ?? 0} completed cleanups · {selected.cleaner_history.paid_rewards_sent ?? 0} paid rewards sent</p>
              </div>
            ) : null}

            {selected.photos && ((selected.photos.before?.length ?? 0) + (selected.photos.after?.length ?? 0) > 0) ? (
              <div className={styles.photoSections}>
                <EvidencePhotos title="Before" urls={selected.photos.before ?? []} />
                <EvidencePhotos title="After" urls={selected.photos.after ?? []} />
              </div>
            ) : null}

            {selected.attempt?.financial_review_summary ? (
              <div className={styles.summaryCard}><h3>Automated review</h3><p>{selected.attempt.financial_review_summary}</p></div>
            ) : null}
            {selected.ai_checks.at(-1)?.reason_codes?.length ? (
              <div className={styles.summaryCard}>
                <h3>Automated findings</h3>
                <p>{selected.ai_checks.at(-1)?.reason_codes.map((code) => code.replaceAll('_', ' ')).join(' · ')}</p>
              </div>
            ) : null}
            {selected.attempt?.dispute_reason ? (
              <div className={styles.summaryCard}><h3>Reporter dispute</h3><p>{selected.attempt.dispute_reason}</p></div>
            ) : null}
            {selected.submissions.at(-1) ? (
              <div className={styles.summaryCard}><h3>Cleaner’s description</h3><p>{selected.submissions.at(-1)?.description}</p></div>
            ) : null}

            {selected.case.status === 'open' ? (
              <div className={styles.decisionPanel}>
                <label>Decision reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} placeholder="Record the evidence and reasoning for this decision." /></label>
                <div className={styles.actionGrid}>
                  {(actions[selected.case.case_type] ?? []).map((action) => (
                    <button key={action.value} className={action.destructive ? styles.dangerButton : styles.primaryButton} onClick={() => void resolve(action)} disabled={Boolean(busy)}>
                      {busy === action.value ? 'Saving…' : action.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.history}>
                <h3>Decision history</h3>
                {selected.actions.map((item) => <p key={item.id}><strong>{item.action.replaceAll('_', ' ')}</strong> — {item.reason}</p>)}
              </div>
            )}
          </>
        ) : null}
        {message && <p className={message.includes('recorded') ? styles.success : styles.error} role="status">{message}</p>}
      </section>
    </div>
  );
}

function EvidencePhotos({ title, urls }: { title: string; urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div>
      <h3>{title}</h3>
      <div className={styles.photoGrid}>
        {urls.map((url, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={url} src={url} alt={`${title} evidence ${index + 1}`} />
        ))}
      </div>
    </div>
  );
}
