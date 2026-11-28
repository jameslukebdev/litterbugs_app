'use client';
import { trackWebsiteOutcome } from '@/lib/website-analytics';

import type { Database, Report } from '@litterbugs/report-contract';
import { useEffect, useState } from 'react';

import { ModalShell } from '@/components/modal-shell';
import { CleanupReviewDone, CleanupReviewPanel, type ReviewMode } from '@/components/cleanup-review-panel';
import { getWebCompatibleReportPhotoUrl } from '@/lib/report-photo';
import { loadCleanupReviewDraft, saveCleanupReviewDraft, clearCleanupReviewDraft } from '@/lib/cleanup-review';
import { useDataRefresh, notifyDataChanged } from '@/lib/use-data-refresh';
import { useCleanupAttempt } from '@/lib/use-cleanup-attempt';
import { createClient } from '@/lib/supabase/client';

type Submission = Database['public']['Tables']['cleanup_submissions']['Row'];

type ReviewContext = {
  submission: Submission;
  cleanerName: string;
  beforeUrls: string[];
  afterUrls: string[];
};

export function CleanupReviewAction({
  report,
  userId,
  isOwner,
  onChanged,
  workspace = false,
}: {
  workspace?: boolean;
  report: Report;
  userId: string | null;
  isOwner: boolean;
  onChanged?: () => void | Promise<void>;
}) {
  const refreshRevision = useDataRefresh(report.cleanup_state === 'completion_submitted' ? 5_000 : 30_000);
  const { attempt, failed: attemptFailed, loading: attemptLoading, checkedAt, refresh: refreshAttempt, clear: clearAttempt } = useCleanupAttempt(report.id, isOwner ? userId : null, true, refreshRevision, report.cleanup_state);
  const [context, setContext] = useState<ReviewContext | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [reasons, setReasons] = useState<string[]>([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [draftUnreadable, setDraftUnreadable] = useState(false);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<ReviewMode>('choose');
  const [confirming, setConfirming] = useState(false);
  const [outcome, setOutcome] = useState<'approved' | 'changes' | 'dispute' | null>(null);
  function updateFeedback(nextNote: string, nextReasons: string[]) {
    setNote(nextNote); setReasons(nextReasons); setMessage('');
    if (!context || !userId || draftUnreadable) return;
    try {
      saveCleanupReviewDraft(userId, context.submission.id, { note: nextNote, reasons: nextReasons });
      setDraftMessage('');
    } catch { setDraftMessage('Feedback could not be saved on this device. Keep this page open.'); }
  }

  const refreshNotice = attemptFailed ? <p role="alert" className="form-message error-message">Cleanup review could not be refreshed. {attempt ? 'Your last confirmed review and feedback are still here. Retry before sending a decision.' : 'Retry to check whether evidence needs your review.'} <button type="button" className="secondary-button" onClick={() => void refreshAttempt()}>Retry cleanup review</button></p> : null;
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
    setMode('choose');
    setConfirming(false);
    setBusy('');
    setOpen(true);
  }

  // On the review page the photos open straight away: no extra "Review cleanup" click.
  const ready = Boolean(attempt) && !attemptFailed;
  useEffect(() => {
    if (workspace && ready && !open && !context && !outcome) queueMicrotask(() => void openReview());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once when the attempt first loads
  }, [workspace, ready]);

  const done = outcome && message
    ? <CleanupReviewDone kind={outcome}>{message}</CleanupReviewDone>
    : message && !open ? <span className="cleanup-action-message" role="status">{message}</span> : null;
  if (!attempt) return <>{refreshNotice}{attemptLoading && <span className="sr-only" role="status">Checking cleanup review…</span>}{done}</>;

  async function completeReview(decision: 'approved' | 'changes_requested') {
    if (attemptFailed || !attempt || !context || busy || !isOwner || !userId) return;
    if (attempt.is_paid && (decision !== 'approved' || !paidReviewAvailable || Date.parse(attempt.review_due_at!) <= Date.now())) {
      setMessage('This funded cleanup is not available for approval. Refresh the review before trying again.');
      void refreshAttempt();
      return;
    }
    if (decision === 'changes_requested' && !reasons.length) {
      setMessage('Choose at least one reason for requesting changes.');
      return;
    }
    setBusy(decision);
    try {
      const { data: reviewedAttempt, error } = await createClient().rpc('review_cleanup', {
        target_cleanup_id: attempt.id,
        target_submission_id: context.submission.id,
        review_decision: decision,
        request_change_reasons: decision === 'changes_requested' ? reasons : undefined,
        // The funded textarea is a dispute reason, not an approval note.
        reviewer_note: attempt.is_paid ? undefined : note.trim() || undefined,
      });
      if (error) {
        setMessage('The cleanup decision could not be saved. Try again.');
        return;
      }
      if (reviewedAttempt?.status !== 'completed' && reviewedAttempt?.status !== 'changes_requested') {
        setMessage('The cleanup is still awaiting review. Your feedback has been kept.');
        return;
      }
      if (userId && context) { try { clearCleanupReviewDraft(userId, context.submission.id); } catch { /* The server decision remains authoritative. */ } }
      if (reviewedAttempt.status === 'completed') trackWebsiteOutcome('cleanup_approved', attempt.id);
      notifyDataChanged();
      setOpen(false);
      setConfirming(false);
      clearAttempt();
      setOutcome(reviewedAttempt.status === 'completed' ? 'approved' : 'changes');
      setMessage(reviewedAttempt.status === 'completed'
        ? attempt.is_paid ? 'Thanks for checking. Payment still depends on the remaining payout and eligibility checks.' : 'Thanks for checking. This spot now shows as cleaned up.'
        : 'The cleaner has been asked for updated evidence.');
      await Promise.resolve().then(() => onChanged?.()).catch(() => undefined);
    } catch {
      setMessage('The cleanup decision could not be confirmed. Refresh the review before trying again. Your feedback has been kept.');
    } finally { setBusy(''); }
  }

  async function disputePaidCleanup() {
    if (attemptFailed) return;
    if (!attempt || note.trim().length < 3) {
      setMessage('Briefly explain what does not look right.');
      return;
    }
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
    clearAttempt();
    setOutcome('dispute');
    setMessage('Dispute submitted. A Litterbugs team member will review the photos and details.');
    await Promise.resolve().then(() => onChanged?.()).catch(() => undefined);
  }

  const paidReviewAvailable = attempt.is_paid
    && attempt.status === 'completion_submitted'
    && attempt.first_paid_admin_status !== 'rejected'
    && attempt.financial_review_status === 'passed'
    && attempt.dispute_status !== 'open'
    && Boolean(attempt.review_due_at && Date.parse(attempt.review_due_at) > checkedAt);

  const paidDisputeAvailable = attempt.is_paid
    && attempt.financial_review_status === 'passed'
    && attempt.dispute_status === 'none'
    && Boolean(attempt.review_due_at && Date.parse(attempt.review_due_at) > checkedAt);

  return (
    <>
      {!(open && context) && refreshNotice}
      {!open && done}
      {!(workspace && (open || busy === 'load')) && <button className="secondary-button compact-button" onClick={openReview} disabled={busy === 'load'}>{busy === 'load' ? 'Loading…' : 'Review cleanup'}</button>}
      {workspace && busy === 'load' && <p className="cleanup-review-loading" role="status">Loading the cleanup photos…</p>}

      {open && context && (
        <ModalShell embedded={workspace} onClose={() => setOpen(false)} label="Review submitted cleanup evidence" className="cleanup-flow-dialog cleanup-review-dialog" closeDisabled={Boolean(busy)}>
          <CleanupReviewPanel
            notice={refreshNotice}
            cleanerName={context.cleanerName}
            submittedAt={context.submission.created_at ?? null}
            description={context.submission.description}
            bags={context.submission.bags_or_items_removed ?? null}
            weight={context.submission.weight_pounds ?? null}
            beforeUrls={context.beforeUrls}
            afterUrls={context.afterUrls}
            paid={attempt.is_paid}
            reviewDueAt={attempt.review_due_at ?? null}
            mode={mode}
            onMode={next => { setMode(next); setConfirming(false); setMessage(''); }}
            confirming={confirming}
            onConfirming={value => { setConfirming(value); setMessage(''); }}
            reasons={reasons}
            note={note}
            onFeedback={updateFeedback}
            busy={busy}
            disabled={attemptFailed}
            paidApproveAvailable={paidReviewAvailable}
            paidDisputeAvailable={paidDisputeAvailable}
            draftMessage={draftMessage}
            message={message}
            onApprove={() => void completeReview('approved')}
            onRequestChanges={() => void completeReview('changes_requested')}
            onDispute={() => void disputePaidCleanup()}
          />
        </ModalShell>
      )}
    </>
  );
}
