'use client';
/* eslint-disable @next/next/no-img-element -- Local object URLs and signed report photos. */
import type { ReactNode } from 'react';
import { Icon } from '@/components/icon';
import { BugCelebration } from '@/components/bug-celebration';

const when = (iso: string) => new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
const PHOTO_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';

function FlowHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="cleaner-head">
      <img src="/brand/ranks/caterpillar.svg" alt="" aria-hidden="true" width={44} height={44} />
      <div><h2>{title}</h2>{children && <p>{children}</p>}</div>
    </header>
  );
}

/**
 * Step 1 of the cleaner flow: what claiming means, the safety guidelines, the agreement (first time only),
 * and two plain confirmations before the claim.
 */
export function CleanupSafetyPanel({
  reportTitle, rewardCents, agreementSaved, waiver, waiverAccepted, onWaiverAccepted, siteConfirmed, onSiteConfirmed,
  busy, disabled, onClaim, notice,
}: {
  reportTitle?: string | null; rewardCents: number; agreementSaved: boolean;
  waiver: { body: string; guidelines_body?: string | null; release_body?: string | null; published_at: string };
  waiverAccepted: boolean; onWaiverAccepted: (value: boolean) => void;
  siteConfirmed: boolean; onSiteConfirmed: (value: boolean) => void;
  busy: boolean; disabled: boolean; onClaim: () => void; notice?: ReactNode;
}) {
  return (
    <div className="cleaner-flow">
      {notice}
      <FlowHead title={agreementSaved ? 'Quick safety check' : 'Before you start'}>{reportTitle}</FlowHead>
      <ul className="cleaner-facts">
        <li><Icon name="calendar" />24 hours to clean and send photos</li>
        <li><Icon name="camera" />Take after photos from the same spot</li>
        {rewardCents > 0 && <li className="cleaner-fact-pay">Pays {money(rewardCents)} once approved</li>}
      </ul>
      {!agreementSaved && (
        <>
          {waiver.guidelines_body && <section className="cleaner-guidelines"><h3>Stay safe</h3><p>{waiver.guidelines_body}</p></section>}
          <section className="cleaner-agreement" aria-label="Cleanup agreement">
            <h3>Cleanup agreement <span>Updated {new Date(waiver.published_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span></h3>
            <div className="cleaner-agreement-text" tabIndex={0}>
              <p>{waiver.body}</p>
              {waiver.release_body && <><h4>Assumption of risk and release</h4><p>{waiver.release_body}</p></>}
            </div>
          </section>
          <label className="cleaner-check">
            <input type="checkbox" checked={waiverAccepted} onChange={event => onWaiverAccepted(event.target.checked)} />
            <span>I confirm I am 18 or older. I have read and accept this version of the safety guidelines, funded reward acknowledgment, assumption of risk, and release.</span>
          </label>
        </>
      )}
      <label className="cleaner-check">
        <input type="checkbox" checked={siteConfirmed} onChange={event => onSiteConfirmed(event.target.checked)} />
        <span>I can legally access this site and clean safely with my equipment, away from moving traffic and hazardous materials. I will stop if conditions become unsafe.</span>
      </label>
      <button className="primary-button cleaner-claim" onClick={onClaim} disabled={disabled || (!agreementSaved && !waiverAccepted) || !siteConfirmed || busy}>
        {busy ? 'Claiming…' : 'Claim this cleanup'}
      </button>
    </div>
  );
}

export type EvidencePhoto = { key: string; src: string | null; name: string };

/**
 * Step 2: add after photos (next to the reporter's photo, so cleaners can match the angle), say what was
 * cleaned, optionally how much, then check everything in the same before/after layout the reporter sees.
 */
export function CleanupEvidencePanel({
  correction, reportTitle, due, reporterPhoto, photos, maxPhotos, onAddFiles, onRemovePhoto,
  description, onDescription, bags, onBags, weight, onWeight,
  checking, onCheck, onEdit, onSubmit, paid,
  fieldsDisabled, checkDisabled, submitDisabled, editDisabled, busy,
  releaseConfirming, onRelease, onReleaseConfirming, releaseDisabled,
  feedback, notice, status, error,
}: {
  correction: boolean; reportTitle?: string | null; due: string | null; reporterPhoto: string | null;
  photos: EvidencePhoto[]; maxPhotos: number; onAddFiles: (files: File[]) => void; onRemovePhoto: (index: number) => void;
  description: string; onDescription: (value: string) => void; bags: string; onBags: (value: string) => void; weight: string; onWeight: (value: string) => void;
  checking: boolean; onCheck: () => void; onEdit: () => void; onSubmit: () => void; paid: boolean;
  fieldsDisabled: boolean; checkDisabled: boolean; submitDisabled: boolean; editDisabled: boolean; busy: string;
  releaseConfirming: boolean; onRelease: () => void; onReleaseConfirming: (value: boolean) => void; releaseDisabled: boolean;
  feedback?: ReactNode; notice?: ReactNode; status?: ReactNode; error?: string;
}) {
  const full = photos.length >= maxPhotos;
  const release = releaseConfirming ? (
    <div className="cleaner-release-confirm" role="group" aria-label="Give this cleanup back">
      <p>Give this cleanup back? It goes back on the map so someone else can clean it. What you&rsquo;ve added here will be cleared.</p>
      <div className="cleaner-buttons">
        <button type="button" className="secondary-button" onClick={() => onReleaseConfirming(false)} disabled={busy === 'release'}>Keep it</button>
        <button type="button" className="danger-button" onClick={onRelease} disabled={releaseDisabled}>{busy === 'release' ? 'Giving it back…' : 'Give it back'}</button>
      </div>
    </div>
  ) : null;
  return (
    <div className="cleaner-flow">
      {notice}
      <FlowHead title={checking ? 'Ready to send?' : correction ? 'Update your cleanup photos' : 'Show what you cleaned'}>
        {due && <>Send by {when(due)}</>}{due && reportTitle && ' · '}{reportTitle}
      </FlowHead>
      {!checking && feedback}

      {checking ? (
        <section className="cleaner-check-step" aria-labelledby="cleaner-check-title">
          <h3 id="cleaner-check-title">This is what the reporter will see</h3>
          <div className="cleaner-compare">
            <figure data-side="before"><figcaption><img src="/brand/bugs/ladybug.png" alt="" aria-hidden="true" width={16} height={16} />Before</figcaption>
              {reporterPhoto ? <img src={reporterPhoto} alt="Reporter's before photo" /> : <div className="cleaner-photo-missing">Reporter&rsquo;s photo</div>}</figure>
            <figure data-side="after"><figcaption><img src="/brand/bugs/flower.png" alt="" aria-hidden="true" width={16} height={16} />After</figcaption>
              {photos[0]?.src ? <img src={photos[0].src} alt="Your first after photo" /> : <div className="cleaner-photo-missing">Your photo</div>}</figure>
          </div>
          {photos.length > 1 && <div className="cleaner-more-photos">{photos.slice(1).map(photo => photo.src && <img key={photo.key} src={photo.src} alt="" />)}<span>+ {photos.length - 1} more {photos.length === 2 ? 'photo' : 'photos'}</span></div>}
          <div className="cleaner-note-card">
            <h4>Your note</h4>
            <p>{description}</p>
            {(bags || weight) && <ul className="cleaner-stats">{bags && <li>{bags} {bags === '1' ? 'bag or item' : 'bags or items'}</li>}{weight && <li>{weight} lb removed</li>}</ul>}
          </div>
          <p className="cleaner-next">{paid ? 'Litterbugs checks the photos first. Then the reporter has 48 hours to approve.' : 'The reporter has 48 hours to check it. If they don’t respond, it’s approved automatically.'}</p>
        </section>
      ) : (
        <fieldset className="cleaner-fields" disabled={fieldsDisabled}>
          <section className="cleaner-step">
            <h3><span aria-hidden="true">1</span>Add after photos</h3>
            <p className="cleaner-hint">1 to {maxPhotos} photos. Try to stand where the reporter did.</p>
            <div className="cleaner-photo-row">
              {reporterPhoto && <figure className="cleaner-tile cleaner-tile-reporter"><img src={reporterPhoto} alt="Reporter's photo of this spot" /><figcaption><img src="/brand/bugs/ladybug.png" alt="" aria-hidden="true" width={13} height={13} />Reporter&rsquo;s photo</figcaption></figure>}
              {photos.map((photo, index) => (
                <figure key={photo.key} className="cleaner-tile">
                  {photo.src && <img src={photo.src} alt={`Selected cleanup evidence ${photo.name}`} />}
                  <button type="button" className="cleaner-tile-remove" onClick={() => onRemovePhoto(index)} aria-label={`Remove ${photo.name}`}><Icon name="close" /></button>
                </figure>
              ))}
              {!full && (
                <label className="cleaner-tile cleaner-tile-add" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); onAddFiles(Array.from(event.dataTransfer.files)); }}>
                  <Icon name="camera" /><span>Add photo</span><small>{photos.length}/{maxPhotos}</small>
                  <input type="file" aria-label="Choose after photos" accept={PHOTO_TYPES} multiple onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; onAddFiles(files); }} />
                </label>
              )}
            </div>
            <label className="phone-camera-picker secondary-button cleaner-camera">
              <Icon name="camera" />Take an after photo
              <input type="file" accept="image/*" capture="environment" disabled={full} onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ''; onAddFiles(files); }} />
            </label>
          </section>
          <section className="cleaner-step">
            <h3 id="cleaner-description-label"><span aria-hidden="true">2</span>What did you clean up?</h3>
            <textarea aria-labelledby="cleaner-description-label" value={description} maxLength={500} rows={3} onChange={event => onDescription(event.target.value)} placeholder="For example: two bags of bottles and cans from along the fence." />
            <small className="cleaner-count">{description.length}/500</small>
          </section>
          <section className="cleaner-step">
            <h3><span aria-hidden="true">3</span>How much? <em>Optional</em></h3>
            <div className="cleaner-amounts">
              <label>Bags or items<input inputMode="numeric" value={bags} onChange={event => onBags(event.target.value)} placeholder="3" /></label>
              <label>Weight (lb)<input inputMode="decimal" value={weight} onChange={event => onWeight(event.target.value)} placeholder="12" /></label>
            </div>
          </section>
        </fieldset>
      )}

      {status}
      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {release ?? (
        <div className="cleaner-actions">
          <button type="button" className="cleaner-release" onClick={() => onReleaseConfirming(true)} disabled={releaseDisabled}>I can&rsquo;t do this cleanup</button>
          <div className="cleaner-buttons">
            {checking
              ? <><button type="button" className="secondary-button" onClick={onEdit} disabled={editDisabled}>Edit</button>
                <button type="button" className="primary-button" onClick={onSubmit} disabled={submitDisabled}>{busy === 'submit' ? 'Sending…' : 'Send cleanup'}</button></>
              : <button type="button" className="primary-button" onClick={onCheck} disabled={checkDisabled}>Check before sending</button>}
          </div>
        </div>
      )}
    </div>
  );
}

/** Shown in place of the action buttons once a claim or a submission is saved. */
export function CleanupDone({ kind, children }: { kind: 'claimed' | 'sent' | 'released'; children: ReactNode }) {
  return (
    <section className="cleaner-done" data-kind={kind} role="status">
      {kind === 'sent' && <BugCelebration />}
      <img src={kind === 'sent' ? '/brand/bugs/flower.png' : kind === 'claimed' ? '/brand/ranks/caterpillar.svg' : '/brand/bugs/ladybug.png'} alt="" aria-hidden="true" width={30} height={30} />
      <div><strong>{kind === 'sent' ? 'Photos sent' : kind === 'claimed' ? 'Cleanup claimed' : 'Cleanup given back'}</strong><p>{children}</p></div>
    </section>
  );
}
