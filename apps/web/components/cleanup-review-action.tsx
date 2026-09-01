'use client';

/* eslint-disable @next/next/no-img-element -- Review evidence uses short-lived signed Storage URLs. */

import type { Database, Report } from '@litterbugs/report-contract';
import { useEffect, useState } from 'react';

import { ModalShell } from '@/components/modal-shell';
import { getWebCompatibleReportPhotoUrl } from '@/lib/report-photo';
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
  const queryKey = userId && isOwner ? `${userId}:${report.id}` : '';
  const [attemptState, setAttemptState] = useState<{ key: string; data: Attempt | null }>({ key: '', data: null });
  const [context, setContext] = useState<ReviewContext | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
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
        if (!cancelled) setAttemptState({ key: queryKey, data });
      });
    return () => { cancelled = true; };
  }, [isOwner, queryKey, report.id, userId]);

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
    setBusy('');
    setOpen(true);
  }

  async function completeReview(decision: 'approved' | 'changes_requested') {
    if (!attempt || !context) return;
    if (decision === 'changes_requested' && note.trim().length < 3) {
      setMessage('Briefly explain what the cleaner should update.');
      return;
    }
    if (!window.confirm(decision === 'approved' ? 'Approve this cleanup?' : 'Request updated cleanup evidence?')) return;
    setBusy(decision);
    const { error } = await createClient().rpc('review_cleanup', {
      target_cleanup_id: attempt.id,
      target_submission_id: context.submission.id,
      review_decision: decision,
      request_change_reasons: decision === 'changes_requested' ? ['Other'] : undefined,
      reviewer_note: note.trim() || undefined,
    });
    setBusy('');
    if (error) {
      setMessage('The cleanup decision could not be saved. Try again.');
      return;
    }
    setOpen(false);
    setAttemptState({ key: queryKey, data: null });
    setMessage(decision === 'approved' ? 'Cleanup approved.' : 'The cleaner has been asked for updated evidence.');
    await onChanged?.();
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
    setOpen(false);
    setAttemptState({ key: queryKey, data: null });
    setMessage('Dispute submitted. A Litterbugs team member will review the photos and details.');
    await onChanged?.();
  }

  const paidDisputeAvailable = attempt.is_paid
    && attempt.financial_review_status === 'passed'
    && attempt.dispute_status === 'none';

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
              {(context.submission.bags_or_items_removed != null || context.submission.duration_minutes != null) && <small>{context.submission.bags_or_items_removed != null ? `${context.submission.bags_or_items_removed} bags/items` : ''}{context.submission.bags_or_items_removed != null && context.submission.duration_minutes != null ? ' · ' : ''}{context.submission.duration_minutes != null ? `${context.submission.duration_minutes} minutes` : ''}</small>}
            </section>
            <label className="cleanup-review-note">{attempt.is_paid ? 'Why are you disputing this cleanup?' : 'Feedback for the cleaner'}<textarea value={note} maxLength={1000} onChange={(event) => { setNote(event.target.value); setMessage(''); }} placeholder={attempt.is_paid ? 'Explain what does not look right.' : 'Required only when asking for changes.'} /></label>
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
