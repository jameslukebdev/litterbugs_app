'use client';
import { trackParticipation, trackParticipationFailure, trackParticipationExit } from '@/lib/website-analytics';
import { useGuestParticipationEntry } from '@/lib/use-guest-participation-entry';
import { trackDeviceSave } from '@/lib/device-save-state';
import { prepareBrowserPhotos } from '@/lib/prepare-browser-photo';

import { usePhotoPreviews } from '@/lib/use-photo-previews';
import { useDraftEditorLock } from '@/lib/use-draft-editor-lock';
import { cloudDrafts } from '@/lib/cloud-drafts';
import { CloudDraftStatus } from '@/components/cloud-draft-status';
import { loadCleanupDraft, saveCleanupDraft, clearCleanupDraft } from '@/lib/saved-cleanup-draft';
import type { Database, Report } from '@litterbugs/report-contract';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CleanupFeedback } from '@/components/cleanup-feedback';
import { CleanupDone, CleanupEvidencePanel, CleanupSafetyPanel } from '@/components/cleanup-evidence-panel';
import { getReportCardPhotoUrl } from '@/lib/report-photo';
import { BrandBug } from '@/components/brand-bug';
import { ModalShell } from '@/components/modal-shell';
import cleanupStartStyles from './cleanup-start-panel.module.css';
import { submitCleanupEvidence } from '@/lib/cleanup-submission';
import { parseCleanupHours } from '@/lib/cleanup-duration';
import { useDataRefresh, notifyDataChanged } from '@/lib/use-data-refresh';
import { useCleanupAttempt } from '@/lib/use-cleanup-attempt';
import { createClient } from '@/lib/supabase/client';
import { loadPayoutStatus } from '@/lib/funding';
import { PayoutSetupAction } from '@/components/payout-setup-action';

type WaiverRow = Database['public']['Tables']['cleanup_waiver_versions']['Row'];
type CleanupWaiver = WaiverRow & {
  guidelines_body?: string | null;
  release_body?: string | null;
};

const MAX_CLEANUP_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

function photoMimeType(file: File) {
  if (file.type) return file.type.toLowerCase() === 'image/jpg' ? 'image/jpeg' : file.type.toLowerCase();
  if (/\.hei[cf]$/i.test(file.name)) return /\.heif$/i.test(file.name) ? 'image/heif' : 'image/heic';
  return '';
}

export function validateCleanupEvidence(files: File[], description: string) {
  if (files.length < 1 || files.length > MAX_CLEANUP_PHOTOS) return 'Add between 1 and 3 after-cleanup photos.';
  const invalid = files.find((file) => file.size > MAX_PHOTO_BYTES || !ALLOWED_PHOTO_TYPES.has(photoMimeType(file)));
  if (invalid) return 'Use JPEG, PNG, WebP, HEIC, or HEIF photos smaller than 5 MB each.';
  if (!description.trim()) return 'Describe what you cleaned up.';
  if (description.trim().length > 500) return 'Keep the description under 500 characters.';
  return '';
}

export function CleanupAction(props: Parameters<typeof CleanupActionForReport>[0]) {
  // A different member/report must not inherit an outstanding check or open payout flow.
  return <CleanupActionForReport key={`${props.userId ?? 'guest'}:${props.report.id}`} {...props} />;
}

function CleanupActionForReport({
  report,
  userId,
  onRequireSignIn,
  onChanged,
  workspace = false,
  autoOpen = false,
}: {
  workspace?: boolean;
  autoOpen?: boolean;
  report: Report;
  userId: string | null;
  onRequireSignIn?: () => void;
  onChanged?: () => void | Promise<void>;
}) {
  const refreshRevision = useDataRefresh();
  const { attempt, loading: attemptLoading, failed: attemptFailed, refresh: refreshAttempt, clear: clearAttempt } = useCleanupAttempt(report.id, userId, false, refreshRevision, report.cleanup_state);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [waiver, setWaiver] = useState<CleanupWaiver | null>(null);
  const [waiverOpen, setWaiverOpen] = useState(false);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [agreementSaved, setAgreementSaved] = useState(false);
  const [siteConfirmed, setSiteConfirmed] = useState(false);
  const [submissionOpen, setSubmissionOpen] = useState(workspace);
  const [preparing, setPreparing] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [bagsOrItems, setBagsOrItems] = useState('');
  const [weightPounds, setWeightPounds] = useState('');
  const [hoursSpent, setHoursSpent] = useState('');
  const [submissionError, setSubmissionError] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [draftReady, setDraftReady] = useState('');
  const [draftStorageFailed, setDraftStorageFailed] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState('');
  const [releaseConfirming, setReleaseConfirming] = useState(false);
  const [doneKind, setDoneKind] = useState<'claimed' | 'sent' | 'released' | null>(null);
  const [payoutEntry, setPayoutEntry] = useState<{ userId: string; reportId: string } | null>(null);
  const entryRequest = useRef(0);
  const openedFromEntry = useRef(false);
  useEffect(() => () => { entryRequest.current += 1; openedFromEntry.current = false; }, [userId, report.id]);
  const previewUrls = usePhotoPreviews(photos);
  const reporterPhoto = report.photo_paths?.[0] ? getReportCardPhotoUrl(report.photo_paths[0]) : null;

  const editorLock = useDraftEditorLock(submissionOpen ? userId : null, attempt ? `cleanup:${attempt.id}` : null);
  const [draftLocked, setDraftLocked] = useState(false);
  useEffect(() => cloudDrafts.subscribe((owner,key,status) => { if(owner===userId && key===`cleanup:${attempt?.id}`) setDraftLocked(status==='submitting'); }), [userId, attempt?.id]);
  const isMyAttempt = Boolean(attempt && attempt.cleaner_id === userId);
  const canSubmit = isMyAttempt && ['claimed', 'changes_requested'].includes(attempt?.status ?? '');
  useEffect(() => {
    if (!userId || !attempt?.id || !canSubmit || !submissionOpen || editorLock !== 'ready') return;
    let cancelled = false;
    void loadCleanupDraft(userId, attempt.id, attempt.correction_due_at ?? null).then(draft => {
      if (cancelled) return;
      setDraftStorageFailed(false);
      setUploadedPaths((draft?.correctionDueAt ?? null) === (attempt.correction_due_at ?? null) ? draft?.uploadedPaths ?? [] : []);
      setSubmissionId(draft?.submissionId && (draft.correctionDueAt ?? null) === (attempt.correction_due_at ?? null) ? draft.submissionId : crypto.randomUUID());
      if (draft) {
        if (draft.photos.length || draft.description.trim()) trackParticipationExit('clean', 'evidence_form', 'draft_resumed');
        setPhotos(draft.photos); setDescription(draft.description); setBagsOrItems(draft.bagsOrItems); setWeightPounds(draft.weightPounds); setHoursSpent(draft.hoursSpent ?? ''); setDraftMessage('Your saved cleanup draft is ready.'); }
      setDraftReady(attempt.id);
    }).catch(() => { if (!cancelled) { setSubmissionId(crypto.randomUUID()); setDraftStorageFailed(true); setDraftReady(attempt.id); setDraftMessage('Draft storage is unavailable. Keep this page open until you submit.'); } });
    return () => { cancelled = true; };
  }, [userId, attempt?.id, attempt?.correction_due_at, canSubmit, submissionOpen, editorLock]);

  useEffect(() => {
    if (!submissionOpen || !userId || !attempt?.id || draftReady !== attempt.id || draftStorageFailed || busy || draftLocked || editorLock !== 'ready') return;
    void saveCleanupDraft(userId, attempt.id, { photos, description, bagsOrItems, weightPounds, hoursSpent, submissionId, uploadedPaths, correctionDueAt: attempt.correction_due_at })
        .then(() => setDraftMessage(''))
        .catch(() => setDraftMessage('Couldn’t save your draft. Keep this page open until you submit.'));
  }, [submissionOpen, userId, attempt?.id, draftReady, draftStorageFailed, busy, photos, description, bagsOrItems, weightPounds, hoursSpent, submissionId, uploadedPaths, attempt?.correction_due_at, draftLocked, editorLock]);

  const deadline = attempt?.status === 'changes_requested' ? attempt.correction_due_at : attempt?.claim_expires_at;

  const markEntryPrompted = useGuestParticipationEntry({ action: 'clean', reportId: report.id, autoOpen, userId,
    available: !attemptLoading && !attemptFailed && !attempt && report.cleanup_state === 'available', onRequireSignIn });

  const openSafetyReview = useCallback(async () => {
    if (!userId || attemptFailed) return;
    const request = ++entryRequest.current;
    setBusy('waiver');
    setMessage('');
    try {
      const { data, error } = await createClient()
        .from('cleanup_waiver_versions')
        .select('*')
        .eq('is_active', true)
        .is('retired_at', null)
        .maybeSingle();
      if (request !== entryRequest.current) return;
      if (error || !data) {
        trackParticipationFailure('clean', 'safety_review', 'safety_load_failed');
        setBusy('');
        setMessage('The cleanup safety acknowledgment is temporarily unavailable. Try again.');
        return;
      }
      const { data: acceptance, error: acceptanceError } = await createClient()
        .from('cleanup_waiver_acceptances')
        .select('waiver_version')
        .eq('user_id', userId)
        .eq('waiver_version', data.waiver_version)
        .eq('guidelines_version', data.guidelines_version)
        .maybeSingle();
      if (request !== entryRequest.current) return;
      setBusy('');
      if (acceptanceError) {
        trackParticipationFailure('clean', 'safety_review', 'safety_load_failed');
        setMessage('Your saved agreement could not be checked. Try again.');
        return;
      }
      setWaiver(data as CleanupWaiver);
      setAgreementSaved(Boolean(acceptance));
      setSiteConfirmed(false);
      setWaiverAccepted(false);
      setWaiverOpen(true);
      trackParticipation('clean', 'safety_review');
    } catch {
      if (request !== entryRequest.current) return;
      trackParticipationFailure('clean', 'safety_review', 'safety_load_failed');
      setBusy('');
      setMessage('The cleanup safety acknowledgment is temporarily unavailable. Try again.');
    }
  }, [userId, attemptFailed]);

  const beginCleanup = useCallback(async () => {
    if (!userId || attemptFailed) return;
    if (report.funded_amount_cents > 0) {
      const request = ++entryRequest.current;
      setBusy('payout');
      setMessage('');
      trackParticipation('clean', 'payout_check');
      try {
        const status = await loadPayoutStatus();
        if (request !== entryRequest.current) return;
        setBusy('');
        if (!status.payoutsEnabled || status.onboardingStatus !== 'enabled') {
          trackParticipation('clean', 'payout_setup');
          setPayoutEntry({ userId, reportId: report.id });
          return;
        }
        trackParticipation('clean', 'payout_ready');
      } catch {
        if (request !== entryRequest.current) return;
        setBusy('');
        trackParticipationFailure('clean', 'payout_check', 'payout_status_load_failed');
        setMessage('Your payout setup could not be checked. Please try Clean again.');
        return;
      }
    }
    await openSafetyReview();
  }, [userId, attemptFailed, report.id, report.funded_amount_cents, openSafetyReview]);

  useEffect(() => {
    if (!autoOpen || !userId || attemptLoading || attemptFailed || attempt
      || report.cleanup_state !== 'available' || openedFromEntry.current) return;
    openedFromEntry.current = true;
    void beginCleanup();
  }, [autoOpen, userId, attemptLoading, attemptFailed, attempt, report.cleanup_state, beginCleanup]);

  function beginClaim() {
    markEntryPrompted();
    trackParticipation('clean', 'action_tapped');
    if (!userId) onRequireSignIn?.();
    else void beginCleanup();
  }

  useEffect(() => {
    if (submissionOpen && canSubmit) trackParticipation('clean', 'evidence_form');
  }, [submissionOpen, canSubmit]);

  async function acceptAndClaim() {
    if (attemptFailed) return;
    if (!waiver || (!agreementSaved && !waiverAccepted) || !siteConfirmed) return;
    setBusy('claim');
    try {
      const supabase = createClient();
      const acceptance = agreementSaved ? { error: null } : await supabase.rpc('accept_cleanup_waiver', {
        accepted_waiver_version: waiver.waiver_version,
        accepted_guidelines_version: waiver.guidelines_version,
      });
      if (acceptance.error) {
        trackParticipationFailure('clean', 'safety_review', 'safety_save_failed');
        setBusy('');
        setMessage('The acknowledgment could not be saved. Try again.');
        return;
      }
      const claim = await supabase.rpc('claim_cleanup', { target_report_id: report.id });
      setBusy('');
      if (claim.error) {
        trackParticipationFailure('clean', 'safety_review', 'claim_failed');
        if (/cleanup_waiver_outdated|cleanup_waiver_required/i.test(claim.error.message)) {
          setWaiverOpen(false);
          await beginClaim();
          setMessage('The safety agreement has changed. Please review the current version.');
          return;
        }
        if (/cleaner_payout_onboarding_required/i.test(claim.error.message)) {
          setWaiverOpen(false);
          setPayoutEntry({ userId: userId!, reportId: report.id });
          trackParticipation('clean', 'payout_setup');
          return;
        }
        setMessage(report.funded_amount_cents > 0
          ? 'Finish cleanup payout setup before claiming this funded cleanup.'
          : 'This cleanup is no longer available to claim. Refresh the report and try again.');
        return;
      }
      setWaiverOpen(false);
      trackParticipation('clean', 'claim_confirmed');
      setDoneKind('claimed');
      setMessage('Cleanup claimed. Submit after-cleanup photos before the deadline.');
    } catch {
      trackParticipationFailure('clean', 'safety_review', 'claim_failed');
      setMessage('This cleanup could not be claimed. Refresh the report and try again.');
      return;
    } finally { setBusy(''); }
    await refreshAttempt();
    await onChanged?.();
  }

  async function releaseClaim() {
    if (attemptFailed || !attempt) return;
    setBusy('release');
    const { error } = await createClient().rpc('release_cleanup', { target_cleanup_id: attempt.id });
    setBusy('');
    if (error) {
      setMessage('The cleanup claim could not be released. Try again.');
      return;
    }
    clearAttempt();
    setSubmissionOpen(false);
    setReleaseConfirming(false);
    setDoneKind('released');
    setMessage('It’s back on the map for someone else to clean.');
    if (userId) await clearCleanupDraft(userId, attempt.id).catch(() => undefined);
    await onChanged?.();
  }

  function parseOptionalInteger(value: string, label: string, min: number, max: number) {
    if (!value.trim()) return { value: undefined as number | undefined };
    if (!/^\d+$/.test(value.trim())) return { error: `${label} must be a whole number.` };
    const parsed = Number(value);
    if (parsed < min || parsed > max) return { error: `${label} must be between ${min} and ${max}.` };
    return { value: parsed };
  }

  function parseOptionalWeight(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return { value: undefined as number | undefined };
    if (!/^(?:\d+|\d*\.\d{1,2})$/.test(trimmed)) {
      return { error: 'Weight removed must be a number with up to two decimal places.' };
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0.1 || parsed > 10000) {
      return { error: 'Weight removed must be between 0.1 and 10,000 pounds.' };
    }
    return { value: parsed };
  }

  function reviewCleanup() {
    const error = validateCleanupEvidence(photos, description)
      || parseOptionalInteger(bagsOrItems, 'Bags or items removed', 0, 9999).error
      || parseOptionalWeight(weightPounds).error
      || parseCleanupHours(hoursSpent).error;
    if (error) { setSubmissionError(error); return; }
    setSubmissionError(''); setReviewing(true);
  }

  async function submitCleanup() {
    if (attemptFailed || !attempt || !userId) return;
    const evidenceError = validateCleanupEvidence(photos, description);
    if (evidenceError) return setSubmissionError(evidenceError);
    const bags = parseOptionalInteger(bagsOrItems, 'Bags or items removed', 0, 9999);
    if (bags.error) return setSubmissionError(bags.error);
    const weight = parseOptionalWeight(weightPounds);
    if (weight.error) return setSubmissionError(weight.error);
    const duration = parseCleanupHours(hoursSpent);
    if (duration.error) return setSubmissionError(duration.error);

    setBusy('submit');
    setSubmissionError('');
    setUploadProgress('Saving and syncing your draft and photos…');
    let submittingEvidence = false;
    try {
      // Await a durable ID before any network mutation, including after a reload.
      await saveCleanupDraft(userId, attempt.id, {
        photos, description, bagsOrItems, weightPounds, hoursSpent, submissionId, uploadedPaths,
        correctionDueAt: attempt.correction_due_at,
      });
      const syncedSubmissionId = await cloudDrafts.begin(userId, `cleanup:${attempt.id}`);
      setSubmissionId(syncedSubmissionId);
      submittingEvidence = true;
      await submitCleanupEvidence({
        cleanupId: attempt.id, userId, submissionId: syncedSubmissionId, photos, description,
        bagsOrItems: bags.value, weightPounds: weight.value, durationMinutes: duration.value, isPaid: attempt.is_paid,
        onProgress: setUploadProgress,
        uploadedPaths,
        onPrepared: async paths => {
          await saveCleanupDraft(userId, attempt.id, {
            photos, description, bagsOrItems, weightPounds, hoursSpent, submissionId: syncedSubmissionId,
            uploadedPaths: paths, correctionDueAt: attempt.correction_due_at,
          });
          setUploadedPaths(paths);
        },
      });
    } catch (error) {
      if (!submittingEvidence) trackParticipationFailure('clean', 'evidence_form', 'draft_save_failed');
      setSubmissionError(error instanceof Error
        ? error.message
        : 'We could not confirm the cleanup. Your draft is preserved; retry to check its status.');
      setBusy('');
      setUploadProgress('');
      return;
    }

    trackParticipation('clean', 'evidence_submitted');
    notifyDataChanged();
    // A UI refresh or local-storage failure cannot turn a committed submission into a failure.
    await clearCleanupDraft(userId, attempt.id).catch(() => undefined);
    setSubmissionOpen(false);
    setReviewing(false);
    setPhotos([]);
    setDescription('');
    setBagsOrItems('');
    setWeightPounds('');
    setHoursSpent('');
    setSubmissionId('');
    setUploadedPaths([]);
    setDoneKind('sent');
    setMessage(attempt.is_paid
      ? 'Cleanup submitted. We’ll review the photos before the 48-hour dispute window starts.'
      : 'Cleanup submitted. The reporter has 48 hours to review it.');
    setBusy('');
    setUploadProgress('');
    await Promise.allSettled([refreshAttempt(), Promise.resolve().then(() => onChanged?.())]);
  }

  async function addEvidencePhotos(selected: File[]) {
    if (busy || preparing || draftLocked || editorLock !== 'ready' || uploadedPaths.length) return;
    if (!selected.length) return;
    if (photos.length + selected.length > MAX_CLEANUP_PHOTOS) { setSubmissionError('Choose no more than 3 photos.'); return; }
    setPreparing(true); setSubmissionError('Preparing photos…');
    let photoFailure: 'photo_prepare_failed' | 'draft_save_failed' = 'photo_prepare_failed';
    try {
      if (!userId || !attempt) return;
      const nextPhotos = await trackDeviceSave(userId, `cleanup:${attempt.id}`, async () => {
        const prepared = await prepareBrowserPhotos(selected, (done, total) => setSubmissionError(`Preparing photos ${done} of ${total}…`));
        photoFailure = 'draft_save_failed';
        const nextPhotos = [...photos, ...prepared];
        setPhotos(nextPhotos);
        await saveCleanupDraft(userId, attempt.id, { photos: nextPhotos, description, bagsOrItems, weightPounds, hoursSpent, submissionId, uploadedPaths, correctionDueAt: attempt.correction_due_at });
        return nextPhotos;
      });
      setPhotos(nextPhotos); setSubmissionError('');
    } catch (error) { trackParticipationFailure('clean', 'evidence_form', photoFailure); setSubmissionError(error instanceof Error ? error.message : 'The photos could not be prepared.'); }
    finally { setPreparing(false); }
  }

  const action = (() => {
    if (report.cleanup_state === 'completed') return null;
    if (attemptFailed && !attempt) return null;
    if (attemptLoading) return <button className="primary-button compact-button report-action-clean" aria-label="Checking cleanup" disabled><BrandBug kind="butterfly" size={21} className="bug-hop" />{report.cleanup_state === 'available' ? 'Clean' : 'Cleanup details'}</button>;
    if (canSubmit) return <button className="primary-button compact-button" onClick={() => setSubmissionOpen(true)}>{attempt?.status === 'changes_requested' ? 'Update cleanup photos' : 'Submit cleanup photos'}</button>;
    if (isMyAttempt && attempt?.status === 'completion_submitted') return <button className="secondary-button compact-button" disabled>Cleanup under review</button>;
    if (attempt && !isMyAttempt) return <span className="cleanup-unavailable-note">Another member is cleaning this report</span>;
    return <button className="primary-button compact-button report-action-clean" onClick={beginClaim} aria-busy={Boolean(busy)} disabled={attemptFailed || Boolean(busy) || preparing || Boolean(payoutEntry)}><BrandBug kind="butterfly" size={21} className="bug-hop" />{busy === 'waiver' ? 'Loading…' : 'Clean'}</button>;
  })();

  const attemptNotice = attemptFailed && <p role="alert" className="form-message error-message">Cleanup status could not be refreshed. {attempt ? 'Your last confirmed task and entered work are still here. Reconnect and retry before sending changes.' : 'Retry before starting a cleanup.'} <button type="button" className="secondary-button" onClick={() => void refreshAttempt()}>Retry cleanup status</button></p>;

  return (
    <>
      {message && (doneKind ? <CleanupDone kind={doneKind}>{message}</CleanupDone> : <span className="cleanup-action-message" role="status">{message}</span>)}
      {!waiverOpen && !(submissionOpen && attempt) && attemptNotice}
      {action}
      {payoutEntry?.userId === userId && payoutEntry.reportId === report.id && <PayoutSetupAction autoOpen onDismiss={reason => {
        if (reason === 'closed') trackParticipationExit('clean', 'payout_setup', 'cancelled');
        setPayoutEntry(null);
      }} onReady={() => {
        setPayoutEntry(null);
        void beginCleanup();
      }} />}
      {canSubmit && !(submissionOpen && attempt) && (releaseConfirming
        ? <div className="cleaner-release-confirm cleaner-release-inline" role="group" aria-label="Give this cleanup back">
            <p>Give this cleanup back? It goes back on the map so someone else can clean it.</p>
            <div className="cleaner-buttons">
              <button type="button" className="secondary-button compact-button" onClick={() => setReleaseConfirming(false)} disabled={busy === 'release'}>Keep it</button>
              <button type="button" className="danger-button compact-button" onClick={() => void releaseClaim()} disabled={attemptFailed || Boolean(busy) || preparing}>{busy === 'release' ? 'Giving it back…' : 'Give it back'}</button>
            </div>
          </div>
        : <button className="secondary-button compact-button" onClick={() => setReleaseConfirming(true)} disabled={attemptFailed || Boolean(busy) || preparing}>I can&rsquo;t do this cleanup</button>)}

      {waiverOpen && waiver && (
        <ModalShell onClose={() => { trackParticipationExit('clean', 'safety_review', 'cancelled'); setWaiverOpen(false); }} label="Cleanup safety and funded reward acknowledgment" className={cleanupStartStyles.dialog} closeDisabled={busy === 'claim'}>
          <CleanupSafetyPanel
            key={`${waiver.waiver_version}:${waiver.guidelines_version}`}
            notice={attemptNotice}
            reportTitle={report.title}
            rewardCents={report.funded_amount_cents ?? 0}
            agreementSaved={agreementSaved}
            waiver={waiver}
            waiverAccepted={waiverAccepted}
            onWaiverAccepted={setWaiverAccepted}
            siteConfirmed={siteConfirmed}
            onSiteConfirmed={setSiteConfirmed}
            busy={busy === 'claim'}
            disabled={attemptFailed}
            onClaim={() => void acceptAndClaim()}
          />
        </ModalShell>
      )}

      {submissionOpen && attempt && (
        <ModalShell embedded={workspace} onClose={() => { trackParticipationExit('clean', 'evidence_form', 'cancelled'); setSubmissionOpen(false); }} label="Submit cleanup evidence" className="cleanup-flow-dialog cleanup-evidence-workspace" closeDisabled={busy === 'submit' || preparing}>
          <CleanupEvidencePanel
            notice={<>{attemptNotice}{editorLock === 'unavailable' && <p role="alert">This cleanup draft is open in another tab. Close that editor before continuing here.</p>}</>}
            correction={attempt.status === 'changes_requested'}
            reportTitle={workspace ? null : report.title}
            due={deadline ?? null}
            reporterPhoto={reporterPhoto}
            photos={photos.map((photo, index) => ({ key: `${photo.name}-${photo.lastModified}-${index}`, src: previewUrls[index] ?? null, name: photo.name }))}
            maxPhotos={MAX_CLEANUP_PHOTOS}
            onAddFiles={files => void addEvidencePhotos(files)}
            onRemovePhoto={index => setPhotos(current => current.filter((_, itemIndex) => itemIndex !== index))}
            description={description}
            onDescription={value => { setDescription(value); setSubmissionError(''); }}
            bags={bagsOrItems}
            onBags={setBagsOrItems}
            weight={weightPounds}
            onWeight={setWeightPounds}
            hours={hoursSpent}
            onHours={value => { setHoursSpent(value); setSubmissionError(''); }}
            checking={reviewing}
            onCheck={reviewCleanup}
            onEdit={() => setReviewing(false)}
            onSubmit={() => void submitCleanup()}
            paid={attempt.is_paid}
            fieldsDisabled={editorLock !== 'ready' || draftLocked || draftReady !== attempt.id || Boolean(busy) || preparing || uploadedPaths.length > 0}
            checkDisabled={editorLock !== 'ready' || Boolean(busy) || preparing || draftReady !== attempt.id}
            submitDisabled={attemptFailed || editorLock !== 'ready' || Boolean(busy) || !submissionId}
            editDisabled={Boolean(busy) || preparing || uploadedPaths.length > 0}
            busy={busy}
            releaseConfirming={releaseConfirming}
            onReleaseConfirming={setReleaseConfirming}
            onRelease={() => void releaseClaim()}
            releaseDisabled={attemptFailed || Boolean(busy) || preparing}
            feedback={attempt.status === 'changes_requested' ? <CleanupFeedback key={attempt.id} cleanupId={attempt.id} /> : null}
            error={preparing && submissionError.startsWith('Preparing') ? '' : submissionError}
            status={<>
              {draftReady !== attempt.id && <p role="status">Loading saved cleanup…</p>}
              <CloudDraftStatus userId={userId!} draftKey={`cleanup:${attempt.id}`} onRestored={async () => { const restored = await loadCleanupDraft(userId!, attempt.id); if(restored) {setPhotos(restored.photos);setDescription(restored.description);setBagsOrItems(restored.bagsOrItems);setWeightPounds(restored.weightPounds);setHoursSpent(restored.hoursSpent ?? '');setSubmissionId(restored.submissionId!);setUploadedPaths([]);} }} />
              {draftMessage && <p className="form-message" role="status">{draftMessage}</p>}
              {(preparing || uploadProgress) && <section className="evidence-transfer cleaner-transfer" aria-label="Evidence transfer"><h3>{preparing ? 'Preparing selected photos' : uploadProgress.includes('review') ? 'Starting evidence review' : uploadProgress.includes('Uploading') ? 'Uploading and checking photos' : 'Saving your evidence'}</h3><p role="status" aria-live="polite">{preparing ? 'Preparing browser-compatible photos. Keep this page open until the device save finishes.' : uploadProgress}</p><p>Uploading a photo does not mean the cleanup has been approved. Your task will show the review result and any requested corrections.</p></section>}
            </>}
          />
        </ModalShell>
      )}
    </>
  );
}
