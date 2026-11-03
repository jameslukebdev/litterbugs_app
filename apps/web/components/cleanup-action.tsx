'use client';
import { trackDeviceSave } from '@/lib/device-save-state';
import { prepareBrowserPhotos } from '@/lib/prepare-browser-photo';

/* eslint-disable @next/next/no-img-element -- Browser-selected cleanup evidence uses local object URLs. */

import { usePhotoPreviews } from '@/lib/use-photo-previews';
import { useDraftEditorLock } from '@/lib/use-draft-editor-lock';
import { cloudDrafts } from '@/lib/cloud-drafts';
import { CloudDraftStatus } from '@/components/cloud-draft-status';
import { loadCleanupDraft, saveCleanupDraft, clearCleanupDraft } from '@/lib/saved-cleanup-draft';
import type { Database, Report } from '@litterbugs/report-contract';
import { useEffect, useMemo, useState } from 'react';

import { CleanupFeedback } from '@/components/cleanup-feedback';
import { Icon } from '@/components/icon';
import { ModalShell } from '@/components/modal-shell';
import { submitCleanupEvidence } from '@/lib/cleanup-submission';
import { useDataRefresh, notifyDataChanged } from '@/lib/use-data-refresh';
import { useCleanupAttempt } from '@/lib/use-cleanup-attempt';
import { createClient } from '@/lib/supabase/client';

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

function PhotoPreview({ file, onRemove }: { file: File; onRemove?: () => void }) {
  const files = useMemo(() => [file], [file]);
  const [src] = usePhotoPreviews(files);

  return (
    <div className="cleanup-photo-preview">
      {src && <img src={src} alt={`Selected cleanup evidence ${file.name}`} />}
      {onRemove && <button type="button" onClick={onRemove} aria-label={`Remove ${file.name}`}><Icon name="close" /></button>}
    </div>
  );
}

export function CleanupAction({
  report,
  userId,
  onRequireSignIn,
  onChanged,
  workspace = false,
}: {
  workspace?: boolean;
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
  const [submissionError, setSubmissionError] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [draftReady, setDraftReady] = useState('');
  const [draftStorageFailed, setDraftStorageFailed] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState('');

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
      if (draft) { setPhotos(draft.photos); setDescription(draft.description); setBagsOrItems(draft.bagsOrItems); setWeightPounds(draft.weightPounds); setDraftMessage('Your saved cleanup draft is ready.'); }
      setDraftReady(attempt.id);
    }).catch(() => { if (!cancelled) { setSubmissionId(crypto.randomUUID()); setDraftStorageFailed(true); setDraftReady(attempt.id); setDraftMessage('Draft storage is unavailable. Keep this page open until you submit.'); } });
    return () => { cancelled = true; };
  }, [userId, attempt?.id, attempt?.correction_due_at, canSubmit, submissionOpen, editorLock]);

  useEffect(() => {
    if (!submissionOpen || !userId || !attempt?.id || draftReady !== attempt.id || draftStorageFailed || busy || draftLocked || editorLock !== 'ready') return;
    void saveCleanupDraft(userId, attempt.id, { photos, description, bagsOrItems, weightPounds, submissionId, uploadedPaths, correctionDueAt: attempt.correction_due_at })
        .then(() => setDraftMessage(''))
        .catch(() => setDraftMessage('Couldn’t save your draft. Keep this page open until you submit.'));
  }, [submissionOpen, userId, attempt?.id, draftReady, draftStorageFailed, busy, photos, description, bagsOrItems, weightPounds, submissionId, uploadedPaths, attempt?.correction_due_at, draftLocked, editorLock]);

  const deadline = useMemo(() => {
    const value = attempt?.status === 'changes_requested' ? attempt.correction_due_at : attempt?.claim_expires_at;
    return value ? new Date(value).toLocaleString() : '';
  }, [attempt]);

  async function beginClaim() {
    if (attemptFailed) return;
    if (!userId) {
      onRequireSignIn?.();
      return;
    }
    setBusy('waiver');
    setMessage('');
    const { data, error } = await createClient()
      .from('cleanup_waiver_versions')
      .select('*')
      .eq('is_active', true)
      .is('retired_at', null)
      .maybeSingle();
    if (error || !data) {
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
    setBusy('');
    if (acceptanceError) {
      setMessage('Your saved agreement could not be checked. Try again.');
      return;
    }
    setWaiver(data as CleanupWaiver);
    setAgreementSaved(Boolean(acceptance));
    setSiteConfirmed(false);
    setWaiverAccepted(false);
    setWaiverOpen(true);
  }

  async function acceptAndClaim() {
    if (attemptFailed) return;
    if (!waiver || (!agreementSaved && !waiverAccepted) || !siteConfirmed) return;
    setBusy('claim');
    const supabase = createClient();
    const acceptance = agreementSaved ? { error: null } : await supabase.rpc('accept_cleanup_waiver', {
      accepted_waiver_version: waiver.waiver_version,
      accepted_guidelines_version: waiver.guidelines_version,
    });
    if (acceptance.error) {
      setBusy('');
      setMessage('The acknowledgment could not be saved. Try again.');
      return;
    }
    const claim = await supabase.rpc('claim_cleanup', { target_report_id: report.id });
    setBusy('');
    if (claim.error) {
      if (/cleanup_waiver_outdated|cleanup_waiver_required/i.test(claim.error.message)) {
        setWaiverOpen(false);
        await beginClaim();
        setMessage('The safety agreement has changed. Please review the current version.');
        return;
      }
      setMessage(report.funded_amount_cents > 0
        ? 'Finish cleanup payout setup before claiming this funded cleanup.'
        : 'This cleanup is no longer available to claim. Refresh the report and try again.');
      return;
    }
    setWaiverOpen(false);
    setMessage('Cleanup claimed. Submit after-cleanup photos before the deadline.');
    await refreshAttempt();
    await onChanged?.();
  }

  async function releaseClaim() {
    if (attemptFailed || !attempt || !window.confirm('Release this cleanup claim so another member can clean it?')) return;
    setBusy('release');
    const { error } = await createClient().rpc('release_cleanup', { target_cleanup_id: attempt.id });
    setBusy('');
    if (error) {
      setMessage('The cleanup claim could not be released. Try again.');
      return;
    }
    clearAttempt();
    setSubmissionOpen(false);
    setMessage('Cleanup claim released.');
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
      || parseOptionalWeight(weightPounds).error;
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

    setBusy('submit');
    setSubmissionError('');
    setUploadProgress('Saving and syncing your draft and photos…');
    try {
      // Await a durable ID before any network mutation, including after a reload.
      await saveCleanupDraft(userId, attempt.id, {
        photos, description, bagsOrItems, weightPounds, submissionId, uploadedPaths,
        correctionDueAt: attempt.correction_due_at,
      });
      const syncedSubmissionId = await cloudDrafts.begin(userId, `cleanup:${attempt.id}`);
      setSubmissionId(syncedSubmissionId);
      await submitCleanupEvidence({
        cleanupId: attempt.id, userId, submissionId: syncedSubmissionId, photos, description,
        bagsOrItems: bags.value, weightPounds: weight.value, isPaid: attempt.is_paid,
        onProgress: setUploadProgress,
        uploadedPaths,
        onPrepared: async paths => {
          await saveCleanupDraft(userId, attempt.id, {
            photos, description, bagsOrItems, weightPounds, submissionId: syncedSubmissionId,
            uploadedPaths: paths, correctionDueAt: attempt.correction_due_at,
          });
          setUploadedPaths(paths);
        },
      });
    } catch (error) {
      setSubmissionError(error instanceof Error
        ? error.message
        : 'We could not confirm the cleanup. Your draft is preserved; retry to check its status.');
      setBusy('');
      setUploadProgress('');
      return;
    }

    notifyDataChanged();
    // A UI refresh or local-storage failure cannot turn a committed submission into a failure.
    await clearCleanupDraft(userId, attempt.id).catch(() => undefined);
    setSubmissionOpen(false);
    setReviewing(false);
    setPhotos([]);
    setDescription('');
    setBagsOrItems('');
    setWeightPounds('');
    setSubmissionId('');
    setUploadedPaths([]);
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
    try {
      if (!userId || !attempt) return;
      const nextPhotos = await trackDeviceSave(userId, `cleanup:${attempt.id}`, async () => {
        const prepared = await prepareBrowserPhotos(selected, (done, total) => setSubmissionError(`Preparing photos ${done} of ${total}…`));
        const nextPhotos = [...photos, ...prepared];
        setPhotos(nextPhotos);
        await saveCleanupDraft(userId, attempt.id, { photos: nextPhotos, description, bagsOrItems, weightPounds, submissionId, uploadedPaths, correctionDueAt: attempt.correction_due_at });
        return nextPhotos;
      });
      setPhotos(nextPhotos); setSubmissionError('');
    } catch (error) { setSubmissionError(error instanceof Error ? error.message : 'The photos could not be prepared.'); }
    finally { setPreparing(false); }
  }

  const action = (() => {
    if (report.cleanup_state === 'completed') return null;
    if (attemptFailed && !attempt) return null;
    if (attemptLoading) return <button className="primary-button compact-button" aria-label="Checking cleanup" disabled>{report.cleanup_state === 'available' ? 'Claim cleanup' : 'Cleanup details'}</button>;
    if (canSubmit) return <button className="primary-button compact-button" onClick={() => setSubmissionOpen(true)}>{attempt?.status === 'changes_requested' ? 'Update cleanup photos' : 'Submit cleanup photos'}</button>;
    if (isMyAttempt && attempt?.status === 'completion_submitted') return <button className="secondary-button compact-button" disabled>Cleanup under review</button>;
    if (attempt && !isMyAttempt) return <span className="cleanup-unavailable-note">Another member is cleaning this report</span>;
    return <button className="primary-button compact-button" onClick={beginClaim} disabled={attemptFailed || Boolean(busy) || preparing}>{userId ? (busy === 'waiver' ? 'Loading…' : 'Claim cleanup') : 'Sign in to clean'}</button>;
  })();

  const attemptNotice = attemptFailed && <p role="alert" className="form-message error-message">Cleanup status could not be refreshed. {attempt ? 'Your last confirmed task and entered work are still here. Reconnect and retry before sending changes.' : 'Retry before starting a cleanup.'} <button type="button" className="secondary-button" onClick={() => void refreshAttempt()}>Retry cleanup status</button></p>;

  return (
    <>
      {message && <span className="cleanup-action-message" role="status">{message}</span>}
      {!waiverOpen && !(submissionOpen && attempt) && attemptNotice}
      {action}
      {canSubmit && <button className="secondary-button compact-button" onClick={releaseClaim} disabled={attemptFailed || Boolean(busy) || preparing}>{busy === 'release' ? 'Releasing…' : 'Release claim'}</button>}

      {waiverOpen && waiver && (
        <ModalShell onClose={() => setWaiverOpen(false)} label="Cleanup safety and funded reward acknowledgment" className="cleanup-flow-dialog cleanup-waiver-dialog" closeDisabled={busy === 'claim'}>
          {attemptNotice}
          <span className="eyebrow">CLEANUP SAFETY</span>
          <h2>{agreementSaved ? 'Confirm this site is safe for you' : 'Cleanup safety and agreement'}</h2>
          {!agreementSaved && <div className="cleanup-waiver-scroll">
            <p className="cleanup-legal-copy">{waiver.body}</p>
            {waiver.guidelines_body && <section className="cleanup-guidelines-card"><h3>Cleanup safety guidelines</h3><p>{waiver.guidelines_body}</p></section>}
            {waiver.release_body && <section className="cleanup-release-card"><h3>Assumption of risk and release</h3><p>{waiver.release_body}</p></section>}
            <p>Updated {new Date(waiver.published_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            <label className="cleanup-acknowledgment">
              <input type="checkbox" checked={waiverAccepted} onChange={(event) => setWaiverAccepted(event.target.checked)} />
              <span>I confirm I am 18 or older. I have read and accept this version of the safety guidelines, funded reward acknowledgment, assumption of risk, and release.</span>
            </label>
          </div>}
          <label className="cleanup-acknowledgment">
            <input type="checkbox" checked={siteConfirmed} onChange={(event) => setSiteConfirmed(event.target.checked)} />
            <span>I can legally access this site and clean safely with my equipment, away from moving traffic and hazardous materials. I will stop if conditions become unsafe.</span>
          </label>
          <p>You have 24 hours to clean and submit photos.</p>
          <button className="primary-button cleanup-flow-submit" onClick={acceptAndClaim} disabled={attemptFailed || (!agreementSaved && !waiverAccepted) || !siteConfirmed || busy === 'claim'}>{busy === 'claim' ? 'Claiming…' : 'Confirm and claim cleanup'}</button>
        </ModalShell>
      )}

      {submissionOpen && attempt && (
        <ModalShell embedded={workspace} onClose={() => setSubmissionOpen(false)} label="Submit cleanup evidence" className="cleanup-flow-dialog cleanup-evidence-workspace" closeDisabled={busy === 'submit' || preparing}>
          {attemptNotice}
          {editorLock === 'unavailable' && <p role="alert">This cleanup draft is open in another tab. Close that editor before continuing here.</p>}
          <span className="eyebrow">CLEANUP EVIDENCE</span>
          <h2>{attempt.status === 'changes_requested' ? 'Update your cleanup photos' : 'Show what you cleaned'}</h2>
          <p className="cleanup-deadline">Submit by {deadline}</p>
          {attempt.status === 'changes_requested' && <CleanupFeedback key={attempt.id} cleanupId={attempt.id} />}
          <fieldset className="cleanup-submission-fields" hidden={reviewing} disabled={editorLock !== 'ready' || draftLocked || draftReady !== attempt.id || Boolean(busy) || preparing || uploadedPaths.length > 0}>
            <label className="field-label">After photos <span>Required · {photos.length}/3</span>
              <span className="cleanup-photo-picker" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void addEvidencePhotos(Array.from(event.dataTransfer.files)); }}><Icon name="camera" />Choose 1–3 photos<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple onChange={async (event) => {
                const selected = Array.from(event.target.files ?? []); event.target.value = '';
                await addEvidencePhotos(selected);
              }} /></span>
            </label>
            <label className="phone-camera-picker secondary-button">Take an after photo<input type="file" accept="image/*" capture="environment" disabled={photos.length >= 3} onChange={event => { const selected = Array.from(event.target.files ?? []); event.target.value = ''; void addEvidencePhotos(selected); }} /></label>
            {!!photos.length && <div className="cleanup-photo-grid">{photos.map((photo, index) => <PhotoPreview key={`${photo.name}-${photo.lastModified}-${index}`} file={photo} onRemove={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))} />)}</div>}
            <label>Cleanup description <span>Required</span><textarea value={description} maxLength={500} onChange={(event) => { setDescription(event.target.value); setSubmissionError(''); }} placeholder="Describe what you removed and where you cleaned." /></label>
            <div className="cleanup-number-grid">
              <label>Bags/items removed <span>Optional</span><input inputMode="numeric" value={bagsOrItems} onChange={(event) => setBagsOrItems(event.target.value)} /></label>
              <label>Weight removed (lb) <span>Optional</span><input inputMode="decimal" value={weightPounds} onChange={(event) => setWeightPounds(event.target.value)} /></label>
            </div>
          </fieldset>
          {draftReady !== attempt.id && <p role="status">Loading saved cleanup…</p>}
          {reviewing && <section className="cleanup-review-summary"><h3>Review your cleanup</h3><div className="cleanup-photo-grid">{photos.map((file, index) => <PhotoPreview key={index} file={file} />)}</div><p>{description}</p><p>{photos.length} after-cleanup {photos.length === 1 ? 'photo' : 'photos'}</p>{bagsOrItems && <p>{bagsOrItems} bags/items removed</p>}{weightPounds && <p>{weightPounds} lb removed</p>}<p>Check your evidence before sending it for review.</p></section>}
          <CloudDraftStatus userId={userId!} draftKey={`cleanup:${attempt.id}`} onRestored={async () => { const restored = await loadCleanupDraft(userId!, attempt.id); if(restored) {setPhotos(restored.photos);setDescription(restored.description);setBagsOrItems(restored.bagsOrItems);setWeightPounds(restored.weightPounds);setSubmissionId(restored.submissionId!);setUploadedPaths([]);} }} />
          {draftMessage && <p className="form-message" role="status">{draftMessage}</p>}
          {(preparing || uploadProgress) && <section className="evidence-transfer" aria-label="Evidence transfer"><h3>{preparing ? 'Preparing selected photos' : uploadProgress.includes('review') ? 'Starting evidence review' : uploadProgress.includes('Uploading') ? 'Uploading and checking photos' : 'Saving your evidence'}</h3><p role="status" aria-live="polite">{preparing ? 'Preparing browser-compatible photos. Keep this page open until the device save finishes.' : uploadProgress}</p><p>Uploading a photo does not mean the cleanup has been approved. Your task will show the review result and any requested corrections.</p></section>}
          {submissionError && <p className="form-message error-message" role="alert">{submissionError}</p>}
          <div className="cleanup-flow-actions">
            <button className="secondary-button" onClick={releaseClaim} disabled={attemptFailed || Boolean(busy) || preparing}>Release claim</button>
            {reviewing ? <><button className="secondary-button" onClick={() => setReviewing(false)} disabled={Boolean(busy) || preparing || uploadedPaths.length > 0}>Edit cleanup</button><button className="primary-button" onClick={submitCleanup} disabled={attemptFailed || editorLock !== 'ready' || Boolean(busy) || !submissionId}>{busy === 'submit' ? 'Submitting…' : 'Submit cleanup'}</button></> : <button className="primary-button" onClick={reviewCleanup} disabled={editorLock !== 'ready' || Boolean(busy) || preparing || draftReady !== attempt.id}>Review cleanup</button>}
          </div>
        </ModalShell>
      )}
    </>
  );
}
