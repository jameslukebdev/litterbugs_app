'use client';

/* eslint-disable @next/next/no-img-element -- Browser-selected cleanup evidence uses local object URLs. */

import type { Database, Report } from '@litterbugs/report-contract';
import { useEffect, useMemo, useState } from 'react';

import { Icon } from '@/components/icon';
import { ModalShell } from '@/components/modal-shell';
import { createClient } from '@/lib/supabase/client';

type CleanupAttempt = Database['public']['Tables']['cleanup_attempts']['Row'];
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

function PhotoPreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [src] = useState(() => URL.createObjectURL(file));

  useEffect(() => {
    return () => URL.revokeObjectURL(src);
  }, [src]);

  return (
    <div className="cleanup-photo-preview">
      {src && <img src={src} alt={`Selected cleanup evidence ${file.name}`} />}
      <button type="button" onClick={onRemove} aria-label={`Remove ${file.name}`}><Icon name="close" /></button>
    </div>
  );
}

export function CleanupAction({
  report,
  userId,
  onRequireSignIn,
  onChanged,
}: {
  report: Report;
  userId: string | null;
  onRequireSignIn?: () => void;
  onChanged?: () => void | Promise<void>;
}) {
  const attemptKey = userId ? `${userId}:${report.id}` : '';
  const [attemptState, setAttemptState] = useState<{ key: string; data: CleanupAttempt | null }>({ key: '', data: null });
  const attempt = attemptState.key === attemptKey ? attemptState.data : null;
  const attemptLoading = Boolean(userId && attemptState.key !== attemptKey);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [waiver, setWaiver] = useState<CleanupWaiver | null>(null);
  const [waiverOpen, setWaiverOpen] = useState(false);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [bagsOrItems, setBagsOrItems] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [submissionError, setSubmissionError] = useState('');

  async function refreshAttempt() {
    if (!userId) {
      return;
    }
    const { data } = await createClient()
      .from('cleanup_attempts')
      .select('*')
      .eq('report_id', report.id)
      .in('status', ['claimed', 'changes_requested', 'completion_submitted'])
      .order('claimed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setAttemptState({ key: attemptKey, data });
  }

  useEffect(() => {
    let cancelled = false;
    if (!userId) return;
    void createClient()
      .from('cleanup_attempts')
      .select('*')
      .eq('report_id', report.id)
      .in('status', ['claimed', 'changes_requested', 'completion_submitted'])
      .order('claimed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setAttemptState({ key: attemptKey, data });
        }
      });
    return () => { cancelled = true; };
  }, [attemptKey, report.id, userId]);

  const isMyAttempt = Boolean(attempt && attempt.cleaner_id === userId);
  const canSubmit = isMyAttempt && ['claimed', 'changes_requested'].includes(attempt?.status ?? '');
  const deadline = useMemo(() => {
    const value = attempt?.status === 'changes_requested' ? attempt.correction_due_at : attempt?.claim_expires_at;
    return value ? new Date(value).toLocaleString() : '';
  }, [attempt]);

  async function beginClaim() {
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
    setBusy('');
    if (error || !data) {
      setMessage('The cleanup safety acknowledgment is temporarily unavailable. Try again.');
      return;
    }
    setWaiver(data as CleanupWaiver);
    setWaiverAccepted(false);
    setWaiverOpen(true);
  }

  async function acceptAndClaim() {
    if (!waiver || !waiverAccepted) return;
    setBusy('claim');
    const supabase = createClient();
    const acceptance = await supabase.rpc('accept_cleanup_waiver', {
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
    if (!attempt || !window.confirm('Release this cleanup claim so another member can clean it?')) return;
    setBusy('release');
    const { error } = await createClient().rpc('release_cleanup', { target_cleanup_id: attempt.id });
    setBusy('');
    if (error) {
      setMessage('The cleanup claim could not be released. Try again.');
      return;
    }
    setAttemptState({ key: attemptKey, data: null });
    setSubmissionOpen(false);
    setMessage('Cleanup claim released.');
    await onChanged?.();
  }

  function parseOptionalInteger(value: string, label: string, min: number, max: number) {
    if (!value.trim()) return { value: undefined as number | undefined };
    if (!/^\d+$/.test(value.trim())) return { error: `${label} must be a whole number.` };
    const parsed = Number(value);
    if (parsed < min || parsed > max) return { error: `${label} must be between ${min} and ${max}.` };
    return { value: parsed };
  }

  async function submitCleanup() {
    if (!attempt || !userId) return;
    const evidenceError = validateCleanupEvidence(photos, description);
    if (evidenceError) return setSubmissionError(evidenceError);
    const bags = parseOptionalInteger(bagsOrItems, 'Bags or items removed', 0, 9999);
    if (bags.error) return setSubmissionError(bags.error);
    const duration = parseOptionalInteger(durationMinutes, 'Cleanup duration', 1, 1440);
    if (duration.error) return setSubmissionError(duration.error);

    setBusy('submit');
    setSubmissionError('');
    const supabase = createClient();
    const submissionId = crypto.randomUUID();
    const paths: string[] = [];

    try {
      for (const [index, photo] of photos.entries()) {
        const mimeType = photoMimeType(photo);
        const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
        const path = `${userId}/${attempt.id}/${submissionId}/after-${index + 1}.${extension}`;
        const { error } = await supabase.storage.from('cleanup_photos').upload(path, photo, {
          contentType: mimeType,
          upsert: false,
        });
        if (error) throw error;
        paths.push(path);
      }

      const { error } = await supabase.rpc('submit_cleanup', {
        target_cleanup_id: attempt.id,
        target_submission_id: submissionId,
        cleanup_description: description.trim(),
        cleanup_photo_paths: paths,
        cleanup_bags_or_items_removed: bags.value,
        cleanup_duration_minutes: duration.value,
      });
      if (error) throw error;

      if (attempt.is_paid) {
        await supabase.functions.invoke('run-financial-maintenance', { body: { cleanupId: attempt.id } }).catch(() => undefined);
      }

      setSubmissionOpen(false);
      setPhotos([]);
      setDescription('');
      setBagsOrItems('');
      setDurationMinutes('');
      setMessage(attempt.is_paid
        ? 'Cleanup submitted. We’ll review the photos before the 48-hour dispute window starts.'
        : 'Cleanup submitted. The reporter has 48 hours to review it.');
      await refreshAttempt();
      await onChanged?.();
    } catch {
      if (paths.length) await supabase.storage.from('cleanup_photos').remove(paths);
      setSubmissionError('The cleanup could not be submitted. Your report was not changed. Try again.');
    } finally {
      setBusy('');
    }
  }

  const action = (() => {
    if (attemptLoading) return <button className="secondary-button compact-button" disabled>Checking cleanup…</button>;
    if (canSubmit) return <button className="primary-button compact-button" onClick={() => setSubmissionOpen(true)}>{attempt?.status === 'changes_requested' ? 'Update cleanup photos' : 'Submit cleanup photos'}</button>;
    if (isMyAttempt && attempt?.status === 'completion_submitted') return <button className="secondary-button compact-button" disabled>Cleanup under review</button>;
    if (attempt && !isMyAttempt) return <span className="cleanup-unavailable-note">Another member is cleaning this report</span>;
    if (report.cleanup_state === 'completed') return null;
    return <button className="primary-button compact-button" onClick={beginClaim} disabled={Boolean(busy)}>{userId ? (busy === 'waiver' ? 'Loading…' : 'Claim cleanup') : 'Sign in to clean'}</button>;
  })();

  return (
    <>
      {message && <span className="cleanup-action-message" role="status">{message}</span>}
      {action}
      {canSubmit && <button className="secondary-button compact-button" onClick={releaseClaim} disabled={Boolean(busy)}>{busy === 'release' ? 'Releasing…' : 'Release claim'}</button>}

      {waiverOpen && waiver && (
        <ModalShell onClose={() => setWaiverOpen(false)} label="Cleanup safety and funded reward acknowledgment" className="cleanup-flow-dialog cleanup-waiver-dialog" closeDisabled={busy === 'claim'}>
          <span className="eyebrow">CLEANUP SAFETY</span>
          <h2>{waiver.title}</h2>
          <div className="cleanup-waiver-scroll">
            <p className="cleanup-legal-copy">{waiver.body}</p>
            {waiver.guidelines_body && <section className="cleanup-guidelines-card"><h3>Cleanup safety guidelines</h3><p>{waiver.guidelines_body}</p></section>}
            {waiver.release_body && <section className="cleanup-release-card"><h3>Assumption of risk and release</h3><p>{waiver.release_body}</p></section>}
            <label className="cleanup-acknowledgment">
              <input type="checkbox" checked={waiverAccepted} onChange={(event) => setWaiverAccepted(event.target.checked)} />
              <span>I confirm I am 18 or older. I have read and accept the safety guidelines, funded reward acknowledgment, assumption of risk, and release for this claim.</span>
            </label>
          </div>
          <button className="primary-button cleanup-flow-submit" onClick={acceptAndClaim} disabled={!waiverAccepted || busy === 'claim'}>{busy === 'claim' ? 'Claiming…' : 'Accept and claim cleanup'}</button>
        </ModalShell>
      )}

      {submissionOpen && attempt && (
        <ModalShell onClose={() => setSubmissionOpen(false)} label="Submit cleanup evidence" className="cleanup-flow-dialog" closeDisabled={busy === 'submit'}>
          <span className="eyebrow">CLEANUP EVIDENCE</span>
          <h2>{attempt.status === 'changes_requested' ? 'Update your cleanup photos' : 'Show what you cleaned'}</h2>
          <p className="cleanup-deadline">Submit by {deadline}</p>
          <div className="cleanup-submission-fields">
            <label className="field-label">After photos <span>Required · {photos.length}/3</span>
              <span className="cleanup-photo-picker"><Icon name="camera" />Choose 1–3 photos<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple onChange={(event) => {
                const selected = Array.from(event.target.files ?? []);
                setPhotos((current) => [...current, ...selected].slice(0, MAX_CLEANUP_PHOTOS));
                setSubmissionError('');
                event.target.value = '';
              }} /></span>
            </label>
            {!!photos.length && <div className="cleanup-photo-grid">{photos.map((photo, index) => <PhotoPreview key={`${photo.name}-${photo.lastModified}-${index}`} file={photo} onRemove={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))} />)}</div>}
            <label>Cleanup description <span>Required</span><textarea value={description} maxLength={500} onChange={(event) => { setDescription(event.target.value); setSubmissionError(''); }} placeholder="Describe what you removed and where you cleaned." /></label>
            <div className="cleanup-number-grid">
              <label>Bags/items removed <span>Optional</span><input inputMode="numeric" value={bagsOrItems} onChange={(event) => setBagsOrItems(event.target.value)} /></label>
              <label>Minutes spent <span>Optional</span><input inputMode="numeric" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} /></label>
            </div>
          </div>
          {submissionError && <p className="form-message error-message" role="alert">{submissionError}</p>}
          <div className="cleanup-flow-actions">
            <button className="secondary-button" onClick={releaseClaim} disabled={Boolean(busy)}>Release claim</button>
            <button className="primary-button" onClick={submitCleanup} disabled={Boolean(busy)}>{busy === 'submit' ? 'Submitting…' : 'Submit cleanup'}</button>
          </div>
        </ModalShell>
      )}
    </>
  );
}
