'use client';

/* eslint-disable @next/next/no-img-element -- Review evidence uses short-lived signed Storage URLs. */

import type { Database, Report } from '@litterbugs/report-contract';
import { useEffect, useState } from 'react';

import { ModalShell } from '@/components/modal-shell';
import { getWebCompatibleReportPhotoUrl } from '@/lib/report-photo';
import { CLEANUP_CHANGE_REASONS, loadCleanupReviewDraft, saveCleanupReviewDraft, clearCleanupReviewDraft } from '@/lib/cleanup-review';
import { useDataRefresh, notifyDataChanged } from '@/lib/use-data-refresh';
import { createClient } from '@/lib/supabase/client';

type Attempt = Database['public']['Tables']['cleanup_attempts']['Row'];
type Submission = Database['public']['Tables']['cleanup_submissions']['Row'];

type ReviewContext = {
  submission: Submission;
  cleanerName: string;
  beforeUrls: string[];
  afterUrls: string[];
};

function EvidencePhotos({ title, urls }: { title: string; urls: string[] }) {
  return (
    <section className="cleanup-evidence-section">
      <h3>{title}</h3>
      <div className="cleanup-evidence-grid">
        {urls.map((url, index) => <img key={url} src={url} alt={`${title} ${index + 1} of ${urls.length}`} />)}
      </div>
    </section>
  );
}

export function CleanupReviewAction({
  report,
  userId,
  isOwner,
  onChanged,
}: {
  report: Report;
  userId: string | null;
  isOwner: boolean;
  onChanged?: () => void | Promise<void>;
}) {
  const refreshRevision = useDataRefresh(report.cleanup_state === 'completion_submitted' ? 5_000 : 30_000);
  const queryKey = userId && isOwner ? `${userId}:${report.id}` : '';
  const [attemptState, setAttemptState] = useState<{ key: string; data: Attempt | null; checkedAt?: number }>({ key: '', data: null });
  const [context, setContext] = useState<ReviewContext | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [reasons, setReasons] = useState<string[]>([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [draftUnreadable, setDraftUnreadable] = useState(false);
  const [message, setMessage] = useState('');
  const attempt = attemptState.key === queryKey ? attemptState.data : null;

  useEffect(() => {
    let cancelled = false;
    if (!userId || !isOwner) return;
    void createClient()
      .from('cleanup_attempts')
      .select('*')
      .eq('report_id', report.id)
      .eq('reporter_id', userId)
      .eq('status', 'completion_submitted')
      .order('latest_submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setAttemptState({ key: queryKey, data, checkedAt: Date.now() });
      });
    return () => { cancelled = true; };
  }, [isOwner, queryKey, report.id, report.cleanup_state, userId, refreshRevision]);

  function updateFeedback(nextNote: string, nextReasons: string[]) {
    setNote(nextNote); setReasons(nextReasons); setMessage('');
    if (!context || !userId || draftUnreadable) return;
    try {
      saveCleanupReviewDraft(userId, context.submission.id, { note: nextNote, reasons: nextReasons });
      setDraftMessage('Feedback saved on this device.');
    } catch { setDraftMessage('Feedback could not be saved on this device. Keep this page open.'); }
  }

  if (!attempt) return message ? <span className="cleanup-action-message" role="status">{message}</span> : null;

  async function openReview() {
    if (!attempt) return;
    setBusy('load');
    setMessage('');
    const supabase = createClient();
    const [submissionResult, cleanerResult] = await Promise.all([
      supabase
        .from('cleanup_submissions')
        .select('*')
        .eq('cleanup_attempt_id', attempt.id)
        .order('submission_number', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('profiles').select('display_name').eq('id', attempt.cleaner_id ?? '').maybeSingle(),
    ]);
    const submission = submissionResult.data;
    if (!submission || submissionResult.error) {
      setBusy('');
      setMessage('Cleanup evidence could not be loaded. Try again.');
      return;
    }
    const { data: photoRecords, error: photoError } = await supabase
      .from('cleanup_submission_photos')
      .select('storage_path, display_order')
      .eq('submission_id', submission.id)
      .order('display_order');
    if (photoError || !photoRecords?.length) {
      setBusy('');
      setMessage('Cleanup evidence could not be loaded. Try again.');
      return;
    }

    const [beforeUrls, afterUrls] = await Promise.all([
      Promise.all((report.photo_paths ?? []).map(async (path) => {
        const compatibilityUrl = getWebCompatibleReportPhotoUrl(path);
        if (compatibilityUrl) return compatibilityUrl;
        const { data } = await supabase.storage.from('report_photos').createSignedUrl(path, 3600);
        return data?.signedUrl ?? '';
      })),
      Promise.all(photoRecords.map(async ({ storage_path: path }) => {
        const { data } = await supabase.storage.from('cleanup_photos').createSignedUrl(path, 3600);
        return data?.signedUrl ?? '';
      })),
    ]);

    setContext({
      submission,
      cleanerName: cleanerResult.data?.display_name || 'Litterbugs cleaner',
      beforeUrls: beforeUrls.filter(Boolean),
      afterUrls: afterUrls.filter(Boolean),
    });
    setNote('');
    setReasons([]);
    setDraftUnreadable(false);
    if (userId) {
      try {
        const saved = loadCleanupReviewDraft(userId, submission.id);
        setNote(saved.note); setReasons(saved.reasons);
        setDraftMessage(saved.note || saved.reasons.length ? 'Saved feedback restored.' : '');
      } catch {
        setDraftUnreadable(true);
        setDraftMessage('Saved feedback could not be read. Keep this page open until you submit.');
      }
    }
    setBusy('');
    setOpen(true);
  }

  async function completeReview(decision: 'approved' | 'changes_requested') {
    if (!attempt || !context) return;
    if (decision === 'changes_requested' && !reasons.length) {
      setMessage('Choose at least one reason for requesting changes.');
      return;
    }
    if (!window.confirm(decision === 'approved' ? 'Approve this cleanup?' : 'Request updated cleanup evidence?')) return;
    setBusy(decision);
    const { data: reviewedAttempt, error } = await createClient().rpc('review_cleanup', {
      target_cleanup_id: attempt.id,
      target_submission_id: context.submission.id,
      review_decision: decision,
      request_change_reasons: decision === 'changes_requested' ? reasons : undefined,
      reviewer_note: note.trim() || undefined,
    });
    setBusy('');
    if (error) {
      setMessage('The cleanup decision could not be saved. Try again.');
      return;
    }
    if (reviewedAttempt?.status !== 'completed' && reviewedAttempt?.status !== 'changes_requested') {
      setMessage('The cleanup is still awaiting review. Your feedback has been kept.');
      return;
    }
    if (userId && context) { try { clearCleanupReviewDraft(userId, context.submission.id); } catch { /* The server decision remains authoritative. */ } }
    notifyDataChanged();
    setOpen(false);
    setAttemptState({ key: queryKey, data: null });
    setMessage(reviewedAttempt.status === 'completed' ? 'Cleanup approved.' : 'The cleaner has been asked for updated evidence.');
    await Promise.resolve().then(() => onChanged?.()).catch(() => undefined);
  }

  async function disputePaidCleanup() {
    if (!attempt || note.trim().length < 3) {
      setMessage('Briefly explain what does not look right.');
      return;
    }
    if (!window.confirm('Submit this dispute for review? The reward will remain paused.')) return;
    setBusy('dispute');
    const { error } = await createClient().rpc('dispute_paid_cleanup', {
      target_cleanup_id: attempt.id,
      dispute_reason: note.trim(),
    });
    setBusy('');
    if (error) {
      setMessage('The dispute could not be submitted. Try again.');
      return;
    }
    if (userId && context) { try { clearCleanupReviewDraft(userId, context.submission.id); } catch { /* The server decision remains authoritative. */ } }
    notifyDataChanged();
    setOpen(false);
    setAttemptState({ key: queryKey, data: null });
    setMessage('Dispute submitted. A Litterbugs team member will review the photos and details.');
    await Promise.resolve().then(() => onChanged?.()).catch(() => undefined);
  }

  const paidDisputeAvailable = attempt.is_paid
    && attempt.financial_review_status === 'passed'
    && attempt.dispute_status === 'none'
    && Boolean(attempt.review_due_at && Date.parse(attempt.review_due_at) > (attemptState.checkedAt ?? 0));

  return (
    <>
      {message && <span className="cleanup-action-message" role="status">{message}</span>}
      <button className="secondary-button compact-button" onClick={openReview} disabled={busy === 'load'}>{busy === 'load' ? 'Loading…' : attempt.is_paid ? 'Review or dispute' : 'Review cleanup'}</button>

      {open && context && (
        <ModalShell onClose={() => setOpen(false)} label="Review submitted cleanup evidence" className="cleanup-flow-dialog cleanup-review-dialog" closeDisabled={Boolean(busy)}>
          <span className="eyebrow">CLEANUP REVIEW</span>
          <h2>Compare the cleanup photos</h2>
          <p className="cleanup-review-summary">Submitted by {context.cleanerName}{attempt.review_due_at ? ` · Automatic approval after ${new Date(attempt.review_due_at).toLocaleString()}` : ''}</p>
          <div className="cleanup-review-scroll">
            <EvidencePhotos title="Before" urls={context.beforeUrls} />
            <EvidencePhotos title="After" urls={context.afterUrls} />
            <section className="cleanup-submission-summary">
              <h3>Cleaner’s description</h3>
              <p>{context.submission.description}</p>
              {(context.submission.bags_or_items_removed != null || context.submission.weight_pounds != null) && <small>{context.submission.bags_or_items_removed != null ? `${context.submission.bags_or_items_removed} bags/items` : ''}{context.submission.bags_or_items_removed != null && context.submission.weight_pounds != null ? ' · ' : ''}{context.submission.weight_pounds != null ? `${context.submission.weight_pounds} lb removed` : ''}</small>}
            </section>
            {!attempt.is_paid && <fieldset className="cleanup-change-reasons"><legend>Reasons for requesting changes</legend>{CLEANUP_CHANGE_REASONS.map(reason => <label key={reason.code}><input type="checkbox" checked={reasons.includes(reason.code)} onChange={event => updateFeedback(note, event.target.checked ? [...reasons, reason.code] : reasons.filter(code => code !== reason.code))} />{reason.label}</label>)}</fieldset>}
            <label className="cleanup-review-note">{attempt.is_paid ? 'Why are you disputing this cleanup?' : 'Feedback for the cleaner'}<textarea value={note} maxLength={attempt.is_paid ? 1000 : 500} onChange={event => updateFeedback(event.target.value, reasons)} placeholder={attempt.is_paid ? 'Explain what does not look right.' : 'Optional details to help the cleaner.'} /></label>
            {draftMessage && <p className="form-message" role="status">{draftMessage}</p>}
            {message && <p className="form-message error-message" role="alert">{message}</p>}
          </div>
          {attempt.is_paid ? (
            <div className="cleanup-flow-actions">
              <span className="cleanup-paid-review-note">The 48-hour review window begins after the photos pass review. No response is needed unless you see a problem.</span>
              <button className="danger-button" onClick={disputePaidCleanup} disabled={!paidDisputeAvailable || Boolean(busy)}>{paidDisputeAvailable ? (busy === 'dispute' ? 'Submitting…' : 'Dispute cleanup') : 'Dispute unavailable'}</button>
            </div>
          ) : (
            <div className="cleanup-flow-actions cleanup-review-actions">
              <button className="secondary-button" onClick={() => completeReview('changes_requested')} disabled={Boolean(busy)}>{busy === 'changes_requested' ? 'Saving…' : 'Request changes'}</button>
              <button className="primary-button" onClick={() => completeReview('approved')} disabled={Boolean(busy)}>{busy === 'approved' ? 'Approving…' : 'Approve cleanup'}</button>
            </div>
          )}
        </ModalShell>
      )}
    </>
  );
}
