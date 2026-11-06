'use client';

import { trackParticipation } from '@/lib/website-analytics';
import { ReportStartPhotoImport } from './report-start-photo-import';
import { prepareBrowserPhotos } from '@/lib/prepare-browser-photo';

/* eslint-disable @next/next/no-img-element -- Blob previews and short-lived signed URLs cannot use the image optimizer. */

import { usePhotoPreviews } from '@/lib/use-photo-previews';
import { useEffect, useRef, useState } from 'react';
import { IoCheckmarkCircle, IoEllipseOutline, IoLeafOutline, IoTrashOutline, IoLayersOutline, IoArrowBackCircle, IoArrowForwardCircle } from 'react-icons/io5';
import { ReportOptionIcon, reportOptionLabel } from './report-option-icon';
import styles from './report-wizard.module.css';

const STEP_TITLES = ['Add photos', 'Type of litter', 'Severity', 'Site conditions', 'Review report'] as const;
import {
  LITTER_OPTIONS,
  MAX_REPORT_NOTES_LENGTH,
  MAX_REPORT_PHOTOS,
  MAX_REPORT_TITLE_LENGTH,
  NOTE_OPTIONS,
  REPORT_STEPS,
  SEVERITY_LEVELS,
  validateReportDraft,
  type ReportDraft,
  type Coordinates,
} from '@litterbugs/report-contract';

import type { ReportWizardSnapshot } from '@/lib/saved-report-draft';

import { Icon } from '@/components/icon';
import { ModalShell } from '@/components/modal-shell';
import { formatUsd, parseContributionAmount } from '@/lib/funding';

const MAX_REPORT_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_REPORT_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function reportPhotoMimeType(photo: File) {
  if (photo.type) return photo.type.toLowerCase() === 'image/jpg' ? 'image/jpeg' : photo.type.toLowerCase();
  if (/\.hei[cf]$/i.test(photo.name)) return /\.heif$/i.test(photo.name) ? 'image/heif' : 'image/heic';
  return '';
}

export function hasRequiredWebReportPhoto({
  photos,
  existingPhotoUrls,
  isEditing,
  existingPhotoCount = existingPhotoUrls.length,
}: {
  photos: File[];
  existingPhotoUrls: string[];
  isEditing: boolean;
  existingPhotoCount?: number;
}) {
  return photos.length > 0 || (isEditing && existingPhotoCount > 0);
}

export function validateWebReportPhotos(photos: File[]) {
  if (photos.length < 1) return 'Add at least one clear photo to continue.';
  if (photos.length > MAX_REPORT_PHOTOS) return `Choose no more than ${MAX_REPORT_PHOTOS} photos.`;
  if (photos.some((photo) => photo.size > MAX_REPORT_PHOTO_BYTES)) {
    return 'Use photos smaller than 5 MB each.';
  }
  if (photos.some((photo) => !ALLOWED_REPORT_PHOTO_TYPES.has(reportPhotoMimeType(photo)))) {
    return 'Use JPEG, PNG, WebP, HEIC, or HEIF photos.';
  }
  return '';
}

export function ReportWizard({
  initialDraft,
  initialState,
  onStateChange,
  onPreparePhotos,
  draftSaveMessage,
  draftSync,
  draftLocked = false,
  submissionProgress,
  isEditing,
  existingPhotoUrls = [],
  existingPhotoCount = existingPhotoUrls.length,
  fundingEnabled = false,
  coordinates,
  selectingLocation = false,
  onChangeLocation,
  onClose,
  onSubmit,
}: {
  initialDraft: ReportDraft;
  initialState?: ReportWizardSnapshot;
  draftSaveMessage?: string;
  draftSync?: React.ReactNode;
  draftLocked?: boolean;
  submissionProgress?: string;
  onStateChange?: (snapshot: ReportWizardSnapshot) => void;
  onPreparePhotos?: (selected: File[], snapshot: ReportWizardSnapshot, progress: (done: number, total: number) => void, onPrepared: (draft: ReportDraft) => void) => Promise<ReportDraft>;
  isEditing: boolean;
  existingPhotoUrls?: string[];
  existingPhotoCount?: number;
  fundingEnabled?: boolean;
  coordinates?: Coordinates;
  selectingLocation?: boolean;
  onChangeLocation?: () => void;
  onClose: () => void;
  onSubmit: (draft: ReportDraft, startingContributionCents: number | null) => Promise<string | null>;
}) {
  const [step, setStep] = useState(initialState?.step ?? 0);
  useEffect(() => {
    const stage = (['photos', 'litter_type', 'severity', 'details', 'review'] as const)[step];
    if (!isEditing && stage) trackParticipation('report', stage);
  }, [step, isEditing]);
  const [draft, setDraft] = useState<ReportDraft>(initialState?.draft ?? initialDraft);
  const [saving, setSaving] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [message, setMessage] = useState('');
  const [returnToReview, setReturnToReview] = useState(false);
  const [fundingChoice, setFundingChoice] = useState(initialState?.fundingChoice ?? 'none');
  const [customAmount, setCustomAmount] = useState(initialState?.customAmount ?? '');
  const wantsFunding = fundingEnabled && !isEditing && fundingChoice !== 'none';
  const contributionCents = wantsFunding
    ? parseContributionAmount(fundingChoice === 'other' ? customAmount : fundingChoice)
    : null;
  const previewUrls = usePhotoPreviews(draft.photos);
  const photoInput = useRef<HTMLInputElement>(null);
  const reviewPhotoUrls = previewUrls.length ? previewUrls : existingPhotoUrls;

  useEffect(() => { onStateChange?.({ draft, step, fundingChoice, customAmount }); }, [draft, step, fundingChoice, customAmount, onStateChange]);

  const errors = validateReportDraft(draft);
  const hasRequiredPhoto = hasRequiredWebReportPhoto({ photos: draft.photos, existingPhotoUrls, existingPhotoCount, isEditing });
  const currentCanAdvance = step === 0
    ? hasRequiredPhoto
    : step === 1
      ? !errors.types
      : step === 2
        ? !errors.severity
        : true;

  function toggleArray(field: 'selectedTypes' | 'selectedNotes', value: string) {
    setDraft((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  }

  function next() {
    setMessage('');
    if (!currentCanAdvance) return;
    setStep((current) => returnToReview ? 4 : Math.min(current + 1, REPORT_STEPS.length - 1));
    setReturnToReview(false);
  }

  function editStep(nextStep: number) {
    setReturnToReview(true);
    setMessage('');
    setStep(nextStep);
  }

  async function submit() {
    if (saving || preparing) return;
    if (!hasRequiredPhoto) {
      setStep(0);
      setMessage('Add at least one clear photo before submitting.');
      return;
    }
    if (Object.keys(errors).length) {
      setMessage('Review the required fields before submitting.');
      return;
    }
    if (wantsFunding && contributionCents == null) {
      setMessage('Choose an amount from $1 to $1,000, or select No contribution now.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const error = await onSubmit(draft, contributionCents);
      if (error) setMessage(error);
    } catch {
      setMessage('Your report could not be confirmed. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function addPhotos(selected: File[]) {
    if (saving || preparing || draftLocked) return;
    if (!selected.length) return;
    if (draft.photos.length + selected.length > MAX_REPORT_PHOTOS) { setMessage('Choose no more than 3 photos.'); return; }
    setPreparing(true); setMessage('Preparing photos…');
    try {
      const progress = (done: number, total: number) => setMessage(`Preparing photos ${done} of ${total}…`);
      if (onPreparePhotos) setDraft(await onPreparePhotos(selected, { draft, step, fundingChoice, customAmount }, progress, setDraft));
      else { const prepared = await prepareBrowserPhotos(selected, progress); setDraft(current => ({ ...current, photos: [...current.photos, ...prepared] })); }
      setMessage('');
      return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The photos could not be prepared.'); return false; }
    finally { setPreparing(false); }
  }

  // Keep the wizard mounted while choosing a new pin, so Files, stage, and
  // contribution choice survive. Unmount just its modal to release scroll lock.
  if (selectingLocation) return null;

  return (
    <ModalShell onClose={onClose} label={isEditing ? 'Edit litter report' : 'Create litter report'} className={`report-wizard ${styles.wizard}`} closeDisabled={saving || preparing}>
      <header className="wizard-header">
        {/* One heading per step: the step name replaces the old title plus sub-heading. */}
        <h2>{STEP_TITLES[step]}{step === 3 && <span className={styles.optionalTag}>Optional</span>}</h2>
      </header>

      {!isEditing && <ReportStartPhotoImport onAdd={async files => { const added = await addPhotos(files); if (added) setStep(0); return added; }} disabled={saving || preparing || draftLocked} />}
      {draftSync}
      {draftSaveMessage && <p role="alert" className="form-error">{draftSaveMessage}</p>}
      <div className="wizard-content" key={step}><fieldset className="wizard-fields" disabled={saving || preparing || draftLocked}>
        {step === 0 && <section className="wizard-step">
          {isEditing && existingPhotoCount > 0 && <div className={styles.existingPhotos}>
            <strong>{draft.photos.length ? 'New photo set selected' : 'Existing photos will stay attached'}</strong>
            {draft.photos.length > 0 && <button type="button" onClick={() => setDraft(current => ({ ...current, photos: [] }))}>Keep existing photos instead</button>}
          </div>}
          <div className={styles.photoStage} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void addPhotos(Array.from(event.dataTransfer.files)); }}>
            {[0, 1, 2].map(index => <div className={styles.photoSlot} key={index}>
              {reviewPhotoUrls[index] ? <>
                <img src={reviewPhotoUrls[index]} alt={`${previewUrls.length ? 'Selected' : 'Existing'} report photo ${index + 1}`} />
                {previewUrls.length > 0 && <button type="button" className={styles.removePhoto} onClick={() => setDraft(current => ({ ...current, photos: current.photos.filter((_, photoIndex) => photoIndex !== index) }))} aria-label={`Remove photo ${index + 1}`}><Icon name="close" /></button>}
              </> : <button type="button" className={styles.emptyPhoto} aria-label={`Add report photo ${index + 1}`} onClick={() => photoInput.current?.click()} disabled={saving || preparing || draftLocked}><Icon name={index === 0 ? 'image' : 'plus'} /></button>}
            </div>)}
          </div>
          <div className={styles.photoActions}>
            <label className={styles.photoAction}><Icon name="image" />Choose photos<input ref={photoInput} type="file" aria-label="Choose report photos" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple disabled={draft.photos.length >= MAX_REPORT_PHOTOS || saving || preparing || draftLocked} onChange={async event => { const selected = Array.from(event.target.files ?? []); event.target.value = ''; await addPhotos(selected); }} /></label>
            <label className={`${styles.photoAction} ${styles.cameraAction}`}><Icon name="camera" />Take photo<input type="file" aria-label="Take a report photo" accept="image/*" capture="environment" disabled={draft.photos.length >= MAX_REPORT_PHOTOS || saving || preparing || draftLocked} onChange={event => { const selected = Array.from(event.target.files ?? []); event.target.value = ''; void addPhotos(selected); }} /></label>
          </div>
          <label className="field-label report-optional-title">Report title (optional)<input value={draft.title} maxLength={MAX_REPORT_TITLE_LENGTH} placeholder="Litter Report" onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        </section>}

        {step === 1 && <section className="wizard-step">
          <div className={styles.optionGrid}>{LITTER_OPTIONS.map(option => <button type="button" className={styles.optionTile} aria-pressed={draft.selectedTypes.includes(option)} onClick={() => toggleArray('selectedTypes', option)} key={option}>{draft.selectedTypes.includes(option) ? <IoCheckmarkCircle aria-hidden="true" /> : <ReportOptionIcon label={option} />}<span>{option}</span></button>)}</div>
          <label className="field-label">Other type of litter<input value={draft.types} placeholder="Add another type" onChange={(event) => setDraft({ ...draft, types: event.target.value })} /></label>
          {errors.types && <p className="required-hint" role="alert">{errors.types}</p>}
        </section>}

        {step === 2 && <section className="wizard-step">
          <div className={styles.severityList}>{SEVERITY_LEVELS.map((severity, index) => {
            const SeverityIcon = [IoLeafOutline, IoTrashOutline, IoLayersOutline][index];
            return <button type="button" className={styles.severityOption} data-severity={severity.toLowerCase()} aria-pressed={draft.severity === severity} onClick={() => setDraft({ ...draft, severity })} key={severity}><SeverityIcon aria-hidden="true" /><span><strong>{severity}</strong><small>{['A few items', 'A noticeable buildup', 'A large amount'][index]}</small></span>{draft.severity === severity ? <IoCheckmarkCircle aria-hidden="true" /> : <IoEllipseOutline aria-hidden="true" />}</button>;
          })}</div>
          {errors.severity && <p className="required-hint" role="alert">{errors.severity}</p>}
        </section>}

        {step === 3 && <section className="wizard-step">
          <div className={styles.optionGrid}>{NOTE_OPTIONS.map(option => <button type="button" className={styles.optionTile} aria-pressed={draft.selectedNotes.includes(option)} onClick={() => toggleArray('selectedNotes', option)} key={option}>{draft.selectedNotes.includes(option) ? <IoCheckmarkCircle aria-hidden="true" /> : <ReportOptionIcon label={option} />}<span>{reportOptionLabel(option)}</span></button>)}</div>
          <label className="field-label">Extra details<textarea value={draft.notes} maxLength={MAX_REPORT_NOTES_LENGTH} placeholder="Add any extra details" onChange={event => setDraft({ ...draft, notes: event.target.value })} /></label>
        </section>}

        {step === 4 && <section className="wizard-step">
          <div className="review-card">
            {draft.title.trim() ? <ReviewRow label="Title" onEdit={() => editStep(0)}><strong>{draft.title.trim()}</strong></ReviewRow> : <button type="button" className={styles.addTitle} onClick={() => editStep(0)}>Add a title</button>}
            <ReviewRow label="Photos" onEdit={() => editStep(0)}>{reviewPhotoUrls.length ? <><div className="review-photos">{reviewPhotoUrls.map((url, index) => <img src={url} alt={`Report photo ${index + 1}`} key={url} />)}</div>{isEditing && previewUrls.length > 0 && existingPhotoCount > 0 && <p>These photos replace the current set when saved.</p>}</> : existingPhotoCount ? <span>{existingPhotoCount} existing photo{existingPhotoCount === 1 ? '' : 's'}</span> : <span>No photos added</span>}</ReviewRow>
            {coordinates && <section className="review-row"><div className="review-row-header"><h4>Location</h4>{!isEditing && onChangeLocation && <button type="button" disabled={saving || preparing} onClick={onChangeLocation} aria-label="Change report location">Edit</button>}</div><div className="review-row-content"><iframe className={styles.locationMap} title="Confirmed report location" src={`https://maps.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}&z=15&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /><a className={styles.mapLink} href={`https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`} target="_blank" rel="noopener noreferrer">View location on map</a></div></section>}
            <ReviewRow label="Type of litter" onEdit={() => editStep(1)}><div className="chip-row">{draft.selectedTypes.map((type) => <span className="detail-chip type-chip" key={type}><ReportOptionIcon label={type} />{type}</span>)}{draft.types.trim() && <span className="detail-chip other-chip">{draft.types.trim()}</span>}</div></ReviewRow>
            <ReviewRow label="Severity" onEdit={() => editStep(2)}><span className={styles.reviewSeverity} data-severity={draft.severity.toLowerCase()}>{draft.severity === 'Low' ? <IoLeafOutline aria-hidden="true" /> : draft.severity === 'Medium' ? <IoTrashOutline aria-hidden="true" /> : <IoLayersOutline aria-hidden="true" />}{draft.severity}</span></ReviewRow>
            <ReviewRow label="Site conditions" onEdit={() => editStep(3)}><div className="chip-row">{draft.selectedNotes.map((note) => <span className="detail-chip note-chip" key={note}><ReportOptionIcon label={note} />{reportOptionLabel(note)}</span>)}</div>{draft.notes.trim() && <p>{draft.notes.trim()}</p>}{!draft.selectedNotes.length && !draft.notes.trim() && <span>No notes added</span>}</ReviewRow>
          </div>
          {fundingEnabled && !isEditing && <section className="starting-fund-card" aria-label="Optional cleanup funding">
            <h4><Icon name="heart" />Start the cleanup fund <span className="step-optional">Optional</span></h4>
            <div className="choice-grid" role="group" aria-label="Starting contribution">
              {[['none', 'No contribution now'], ['1', '$1'], ['5', '$5'], ['10', '$10'], ['25', '$25'], ['other', 'Other']].map(([value, label]) => (
                <button type="button" className={`choice-chip ${fundingChoice === value ? 'choice-selected' : ''}`} aria-pressed={fundingChoice === value} onClick={() => { setFundingChoice(value); setMessage(''); }} key={value}>{label}</button>
              ))}
            </div>
            {fundingChoice === 'none' && <p>Post without paying. Others can still contribute to this cleanup.</p>}
            {fundingChoice === 'other' && <label className="field-label">Starting contribution amount ($)<input value={customAmount} inputMode="decimal" maxLength={7} placeholder="1.00" onChange={(event) => setCustomAmount(event.target.value)} /></label>}
            {contributionCents != null && <dl className="funding-summary">
              <div><dt>Contribution</dt><dd>{formatUsd(contributionCents)}</dd></div>
              <div><dt>Service fee</dt><dd>Shown at checkout</dd></div>
              <div><dt>Total</dt><dd>Confirmed before payment</dd></div>
            </dl>}
            {wantsFunding && <p>You’ll confirm payment separately after the report is saved and eligible for funding.</p>}
          </section>}
            <button type="button" className={`primary-button ${styles.submitButton}`} onClick={submit} disabled={saving || preparing || (wantsFunding && contributionCents == null)}>{saving ? submissionProgress || 'Saving report…' : isEditing ? 'Save changes' : 'Submit report'}</button>
        </section>}
      </fieldset></div>

      {message && <p className="form-message error-message wizard-message" role="alert">{message}</p>}
      <footer className="wizard-footer">
        <button type="button" className={styles.arrowButton} aria-label={step === 0 && !returnToReview ? 'Cancel' : 'Back'} onClick={() => { if (returnToReview) { setStep(4); setReturnToReview(false); } else if (step === 0) onClose(); else setStep(step - 1); }} disabled={saving || preparing}><IoArrowBackCircle aria-hidden="true" /></button>
        <div className={styles.stepProgress} aria-live="polite"><span>Step {step + 1} of {REPORT_STEPS.length}</span><div className={styles.stepDots} aria-hidden="true">{REPORT_STEPS.map((label, index) => <span key={label} data-active={index === step} />)}</div></div>
        {step < REPORT_STEPS.length - 1 ? <button type="button" className={styles.arrowButton} aria-label={returnToReview ? 'Back to review' : 'Next'} onClick={next} disabled={saving || preparing || !currentCanAdvance}><IoArrowForwardCircle aria-hidden="true" /></button> : <span className={styles.footerSpacer} />}
      </footer>
    </ModalShell>
  );
}

function ReviewRow({ label, onEdit, children }: { label: string; onEdit: () => void; children: React.ReactNode }) {
  return <section className="review-row"><div className="review-row-header"><h4>{label}</h4><button type="button" onClick={onEdit} aria-label={`Edit ${label.toLowerCase()}`}>Edit</button></div><div className="review-row-content">{children}</div></section>;
}
