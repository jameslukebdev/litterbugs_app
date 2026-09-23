'use client';

/* eslint-disable @next/next/no-img-element -- Blob previews and short-lived signed URLs cannot use the image optimizer. */

import { useEffect, useMemo, useState } from 'react';
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
} from '@litterbugs/report-contract';

import { Icon } from '@/components/icon';
import { ModalShell } from '@/components/modal-shell';
import { calculatePlatformFee, formatUsd, parseContributionAmount } from '@/lib/funding';

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
  isEditing,
  existingPhotoUrls = [],
  existingPhotoCount = existingPhotoUrls.length,
  fundingEnabled = false,
  onClose,
  onSubmit,
}: {
  initialDraft: ReportDraft;
  isEditing: boolean;
  existingPhotoUrls?: string[];
  existingPhotoCount?: number;
  fundingEnabled?: boolean;
  onClose: () => void;
  onSubmit: (draft: ReportDraft, startingContributionCents: number | null) => Promise<string | null>;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ReportDraft>(initialDraft);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [returnToReview, setReturnToReview] = useState(false);
  const [fundingChoice, setFundingChoice] = useState('none');
  const [customAmount, setCustomAmount] = useState('');
  const wantsFunding = fundingEnabled && !isEditing && fundingChoice !== 'none';
  const contributionCents = wantsFunding
    ? parseContributionAmount(fundingChoice === 'other' ? customAmount : fundingChoice)
    : null;
  const previewUrls = useMemo(() => draft.photos.map((photo) => URL.createObjectURL(photo)), [draft.photos]);

  useEffect(() => () => previewUrls.forEach((url) => URL.revokeObjectURL(url)), [previewUrls]);

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
    if (saving) return;
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

  return (
    <ModalShell onClose={onClose} label={isEditing ? 'Edit litter report' : 'Create litter report'} className="report-wizard" closeDisabled={saving}>
      <header className="wizard-header">
        <span className="eyebrow">{isEditing ? 'EDIT REPORT' : 'NEW LITTER REPORT'}</span>
        <div className="wizard-heading-row"><h2>{REPORT_STEPS[step]}</h2><span>Step {step + 1} of {REPORT_STEPS.length}</span></div>
        <div className="wizard-progress"><span style={{ width: `${((step + 1) / REPORT_STEPS.length) * 100}%` }} /></div>
      </header>

      <div className="wizard-content" key={step}><fieldset className="wizard-fields" disabled={saving}>
        {step === 0 && <section className="wizard-step">
          <span className="step-required">REQUIRED</span>
          <h3>Add photos</h3>
          <p>Add at least one clear photo so volunteers can identify the site and see what the area looked like before cleanup.</p>
          {isEditing && existingPhotoCount > 0 && <div className="existing-photo-notice"><Icon name="image" /><strong>{draft.photos.length ? 'New photos will replace the current set when you save' : 'Keep these photos or choose a replacement set'}</strong><span>Choose one to three new photos to replace all existing photos. Remove the new selections to keep the originals.</span>{!draft.photos.length && <div className="photo-grid">{existingPhotoUrls.map((url, index) => <img src={url} alt={`Existing report photo ${index + 1}`} key={url} />)}</div>}</div>}
          <>
            <label className={`photo-picker ${draft.photos.length >= MAX_REPORT_PHOTOS ? 'photo-picker-disabled' : ''}`}>
              <span className="photo-picker-icon"><Icon name="camera" /></span>
              <strong>{draft.photos.length >= MAX_REPORT_PHOTOS ? '3 photos added' : isEditing && existingPhotoCount && !draft.photos.length ? 'Choose replacement photos' : 'Add a photo'}</strong>
              <span>1–3 photos · 5 MB each</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple disabled={draft.photos.length >= MAX_REPORT_PHOTOS} onChange={(event) => {
                const additions = [...draft.photos, ...Array.from(event.target.files ?? [])];
                const photoError = validateWebReportPhotos(additions);
                if (photoError) {
                  setMessage(photoError);
                } else {
                  setMessage('');
                  setDraft((current) => ({ ...current, photos: additions.slice(0, MAX_REPORT_PHOTOS) }));
                }
                event.target.value = '';
              }} />
            </label>
            {previewUrls.length > 0 && <div className="photo-grid">{previewUrls.map((url, index) => <div className="photo-preview" key={url}><img src={url} alt={`Selected report photo ${index + 1}`} /><button onClick={() => setDraft((current) => ({ ...current, photos: current.photos.filter((_, photoIndex) => photoIndex !== index) }))} aria-label={`Remove photo ${index + 1}`}><Icon name="close" /></button></div>)}</div>}
          </>
          {!hasRequiredPhoto && <p className="required-hint" role="alert">Add at least one photo to continue.</p>}
          <label className="field-label report-optional-title">Report title (optional)<input value={draft.title} maxLength={MAX_REPORT_TITLE_LENGTH} placeholder="Litter Report" onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <span className="character-count">{draft.title.length}/{MAX_REPORT_TITLE_LENGTH}</span>
        </section>}

        {step === 1 && <section className="wizard-step">
          <span className="step-required">REQUIRED</span>
          <h3>What kind of litter did you find?</h3>
          <p>Select all that apply. You can also type something that isn’t listed.</p>
          <div className="choice-grid">{LITTER_OPTIONS.map((option) => <button className={`choice-chip ${draft.selectedTypes.includes(option) ? 'choice-selected' : ''}`} aria-pressed={draft.selectedTypes.includes(option)} onClick={() => toggleArray('selectedTypes', option)} key={option}>{option}</button>)}</div>
          <label className="field-label">Other<input value={draft.types} placeholder="Mattress, appliances, or another type" onChange={(event) => setDraft({ ...draft, types: event.target.value })} /></label>
          {errors.types && <p className="required-hint" role="alert">{errors.types}</p>}
        </section>}

        {step === 2 && <section className="wizard-step">
          <span className="step-required">REQUIRED</span>
          <h3>How severe is it?</h3>
          <p>Choose the level that best matches what you saw.</p>
          <div className="severity-options">{SEVERITY_LEVELS.map((severity) => <button className={`severity-option severity-option-${severity.toLowerCase()} ${draft.severity === severity ? 'severity-selected' : ''}`} aria-pressed={draft.severity === severity} onClick={() => setDraft({ ...draft, severity })} key={severity}><span className="severity-option-icon">{severity === 'Low' ? '●' : severity === 'Medium' ? '◆' : '▲'}</span><strong>{severity}</strong><span className="radio-mark" /></button>)}</div>
          {errors.severity && <p className="required-hint" role="alert">{errors.severity}</p>}
        </section>}

        {step === 3 && <section className="wizard-step">
          <span className="step-optional">OPTIONAL · RECOMMENDED</span>
          <h3>Anything else people should know?</h3>
          <p>Add details that could help someone safely find and understand the site.</p>
          <div className="choice-grid">{NOTE_OPTIONS.map((option) => <button className={`choice-chip note-choice ${draft.selectedNotes.includes(option) ? 'choice-selected' : ''}`} aria-pressed={draft.selectedNotes.includes(option)} onClick={() => toggleArray('selectedNotes', option)} key={option}>{option}</button>)}</div>
          <label className="field-label">Other<textarea value={draft.notes} maxLength={MAX_REPORT_NOTES_LENGTH} placeholder="Add any extra details" onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
          <span className="character-count">{draft.notes.length}/{MAX_REPORT_NOTES_LENGTH}</span>
        </section>}

        {step === 4 && <section className="wizard-step">
          <span className="step-optional">FINAL STEP</span>
          <h3>Review your report</h3>
          <p>Make sure everything looks right before you submit it.</p>
          <div className="review-card">
            <ReviewRow label="Title" onEdit={() => editStep(0)}><strong>{draft.title.trim() || 'Litter Report'}</strong></ReviewRow>
            <ReviewRow label="Photos" onEdit={() => editStep(0)}>{previewUrls.length ? <><div className="review-photos">{previewUrls.map((url, index) => <img src={url} alt={`Report photo ${index + 1}`} key={url} />)}</div>{isEditing && existingPhotoCount > 0 && <p>These photos replace the current set when saved.</p>}</> : existingPhotoCount ? <span>{existingPhotoCount} existing photo{existingPhotoCount === 1 ? '' : 's'}</span> : <span>No photos added</span>}</ReviewRow>
            <ReviewRow label="Litter Types" onEdit={() => editStep(1)}><div className="chip-row">{draft.selectedTypes.map((type) => <span className="detail-chip type-chip" key={type}>{type}</span>)}{draft.types.trim() && <span className="detail-chip other-chip">{draft.types.trim()}</span>}</div></ReviewRow>
            <ReviewRow label="Severity" onEdit={() => editStep(2)}><strong>{draft.severity}</strong></ReviewRow>
            <ReviewRow label="Site conditions" onEdit={() => editStep(3)}><div className="chip-row">{draft.selectedNotes.map((note) => <span className="detail-chip note-chip" key={note}>{note}</span>)}</div>{draft.notes.trim() && <p>{draft.notes.trim()}</p>}{!draft.selectedNotes.length && !draft.notes.trim() && <span>No notes added</span>}</ReviewRow>
          </div>
          {fundingEnabled && !isEditing && <section className="starting-fund-card" aria-label="Optional cleanup funding">
            <h4>Start the cleanup fund <span className="step-optional">Optional</span></h4>
            <div className="choice-grid" role="group" aria-label="Starting contribution">
              {[['none', 'No contribution now'], ['1', '$1'], ['5', '$5'], ['10', '$10'], ['25', '$25'], ['other', 'Other']].map(([value, label]) => (
                <button type="button" className={`choice-chip ${fundingChoice === value ? 'choice-selected' : ''}`} aria-pressed={fundingChoice === value} onClick={() => { setFundingChoice(value); setMessage(''); }} key={value}>{label}</button>
              ))}
            </div>
            {fundingChoice === 'none' && <p>Post without paying. Others can still contribute to this cleanup.</p>}
            {fundingChoice === 'other' && <label className="field-label">Starting contribution amount ($)<input value={customAmount} inputMode="decimal" maxLength={7} placeholder="1.00" onChange={(event) => setCustomAmount(event.target.value)} /></label>}
            {contributionCents != null && <dl className="funding-summary">
              <div><dt>Contribution</dt><dd>{formatUsd(contributionCents)}</dd></div>
              <div><dt>Litterbugs fee (10%)</dt><dd>{formatUsd(calculatePlatformFee(contributionCents))}</dd></div>
              <div><dt>Total</dt><dd>{formatUsd(contributionCents + calculatePlatformFee(contributionCents))}</dd></div>
            </dl>}
            {wantsFunding && <p>You’ll confirm payment separately after the report is saved and eligible for funding.</p>}
          </section>}
        </section>}
      </fieldset></div>

      {message && <p className="form-message error-message wizard-message" role="alert">{message}</p>}
      <footer className="wizard-footer">
        <button className="secondary-button wizard-back" onClick={() => { if (returnToReview) { setStep(4); setReturnToReview(false); } else if (step === 0) onClose(); else setStep(step - 1); }} disabled={saving}><Icon name="chevron-left" />{step === 0 && !returnToReview ? 'Cancel' : 'Back'}</button>
        {step < REPORT_STEPS.length - 1 ? <button className="primary-button wizard-next" onClick={next} disabled={saving || !currentCanAdvance}><span>{returnToReview ? 'Back to review' : 'Next'}</span><Icon name="chevron-right" /></button> : <button className="primary-button wizard-next" onClick={submit} disabled={saving || (wantsFunding && contributionCents == null)}>{saving ? 'Saving report…' : isEditing ? 'Save changes' : 'Submit report'}</button>}
      </footer>
    </ModalShell>
  );
}

function ReviewRow({ label, onEdit, children }: { label: string; onEdit: () => void; children: React.ReactNode }) {
  return <section className="review-row"><div className="review-row-header"><h4>{label}</h4><button onClick={onEdit} aria-label={`Edit ${label.toLowerCase()}`}>Edit</button></div><div className="review-row-content">{children}</div></section>;
}
