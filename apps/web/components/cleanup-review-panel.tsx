'use client';
/* eslint-disable @next/next/no-img-element -- Review evidence uses short-lived signed Storage URLs. */
import { useState, type ReactNode } from 'react';
import { CLEANUP_CHANGE_REASONS } from '@/lib/cleanup-review';
import { BugCelebration } from '@/components/bug-celebration';

export type ReviewMode = 'choose' | 'changes' | 'problem';

const when = (iso: string) => new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** One side of the comparison: a large photo, plus thumbnails when there is more than one. */
function EvidenceGallery({ side, urls }: { side: 'before' | 'after'; urls: string[] }) {
  const [index, setIndex] = useState(0);
  const label = side === 'before' ? 'Before' : 'After';
  const current = urls[Math.min(index, urls.length - 1)];
  return (
    <figure className="cleanup-review-side" data-side={side}>
      <figcaption>
        <img src={side === 'before' ? '/brand/bugs/ladybug.png' : '/brand/bugs/flower.png'} alt="" aria-hidden="true" width={16} height={16} />
        {label}{urls.length > 1 && <span>{urls.length} photos</span>}
      </figcaption>
      {current ? (
        <a className="cleanup-review-main" href={current} target="_blank" rel="noreferrer" aria-label={`Open ${label.toLowerCase()} photo ${index + 1} full size`}>
          <img src={current} alt={`${label} photo ${index + 1} of ${urls.length}`} />
        </a>
      ) : <div className="cleanup-review-main cleanup-review-missing">No {label.toLowerCase()} photo</div>}
      {urls.length > 1 && (
        <div className="cleanup-review-thumbs">
          {urls.map((url, n) => (
            <button key={url} type="button" aria-label={`Show ${label.toLowerCase()} photo ${n + 1}`} aria-pressed={n === index} onClick={() => setIndex(n)}>
              <img src={url} alt="" />
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}

/**
 * What the reporter sees when a cleanup comes back: who cleaned it, before and after photos side by side,
 * the cleaner's note, then one clear decision. Asking for changes (or, for funded cleanups, reporting a
 * problem) opens its own short step, so approving stays a single tap.
 */
export function CleanupReviewPanel({
  cleanerName, submittedAt, description, bags, weight, beforeUrls, afterUrls,
  paid, reviewDueAt, mode, onMode, confirming, onConfirming,
  reasons, note, onFeedback, busy, disabled, paidApproveAvailable, paidDisputeAvailable,
  draftMessage, message, notice, onApprove, onRequestChanges, onDispute,
}: {
  cleanerName: string; submittedAt: string | null; description: string; bags: number | null; weight: number | null;
  beforeUrls: string[]; afterUrls: string[];
  paid: boolean; reviewDueAt: string | null;
  mode: ReviewMode; onMode: (mode: ReviewMode) => void;
  confirming: boolean; onConfirming: (confirming: boolean) => void;
  reasons: string[]; note: string; onFeedback: (note: string, reasons: string[]) => void;
  busy: string; disabled: boolean; paidApproveAvailable: boolean; paidDisputeAvailable: boolean;
  draftMessage: string; message: string; notice?: ReactNode;
  onApprove: () => void; onRequestChanges: () => void; onDispute: () => void;
}) {
  const firstName = cleanerName.split(' ')[0] || cleanerName;
  const locked = disabled || Boolean(busy);
  const toggle = (code: string) => onFeedback(note, reasons.includes(code) ? reasons.filter(item => item !== code) : [...reasons, code]);
  return (
    <div className="cleanup-review">
      {notice}
      <header className="cleanup-review-head">
        <span className="cleanup-review-avatar" aria-hidden="true">{cleanerName.trim().charAt(0).toUpperCase() || 'L'}</span>
        <div>
          <h2>{cleanerName} cleaned up this spot</h2>
          <p>
            {submittedAt && <>Sent {when(submittedAt)}. </>}
            {reviewDueAt && (paid
              ? <>You have until {when(reviewDueAt)} to approve or report a problem. After that it&rsquo;s approved automatically.</>
              : <>If you don&rsquo;t respond by {when(reviewDueAt)}, it&rsquo;s approved automatically.</>)}
          </p>
        </div>
      </header>

      <div className="cleanup-review-compare">
        <EvidenceGallery side="before" urls={beforeUrls} />
        <EvidenceGallery side="after" urls={afterUrls} />
      </div>

      <section className="cleanup-review-note-card" aria-label={`${firstName}'s note`}>
        <h3>{firstName}&rsquo;s note</h3>
        <p>{description}</p>
        {(bags != null || weight != null) && (
          <ul className="cleanup-review-stats">
            {bags != null && <li>{bags} {bags === 1 ? 'bag or item' : 'bags or items'}</li>}
            {weight != null && <li>{weight} lb removed</li>}
          </ul>
        )}
      </section>

      <section className="cleanup-review-decide" aria-label="Your decision">
        {mode === 'choose' && !confirming && <h3>Does the spot look clean now?</h3>}
        {mode === 'changes' && (
          <fieldset className="cleanup-review-reasons">
            <legend>What should {firstName} fix?</legend>
            <div>
              {CLEANUP_CHANGE_REASONS.map(reason => (
                <label key={reason.code}>
                  <input type="checkbox" checked={reasons.includes(reason.code)} onChange={() => toggle(reason.code)} />
                  <span>{reason.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {!paid && (
          <label className="cleanup-review-message">
            {mode === 'changes' ? 'Anything else they should know? (optional)' : `Message for ${firstName} (optional)`}
            <textarea value={note} maxLength={500} rows={2} onChange={event => onFeedback(event.target.value, reasons)}
              placeholder={mode === 'changes' ? 'For example: the bags by the fence are still there.' : 'Say thanks, or add a detail.'} />
          </label>
        )}
        {paid && mode === 'problem' && (
          <label className="cleanup-review-message">
            What doesn&rsquo;t look right?
            <textarea value={note} maxLength={1000} rows={3} onChange={event => onFeedback(event.target.value, reasons)} placeholder="For example: the litter by the creek is still there." />
            <small>The reward stays paused while the Litterbugs team checks the photos.</small>
          </label>
        )}
        {draftMessage && <p className="cleanup-review-draft" role="status">{draftMessage}</p>}
        {message && <p className="form-message error-message" role="alert">{message}</p>}

        {confirming ? (
          <div className="cleanup-review-confirm" role="group" aria-label="Confirm approval">
            <p>Approve this funded cleanup? This ends your remaining dispute window. Payment still goes through its usual checks.</p>
            <div className="cleanup-review-buttons">
              <button type="button" className="secondary-button" onClick={() => onConfirming(false)} disabled={Boolean(busy)}>Not yet</button>
              <button type="button" className="primary-button" onClick={onApprove} disabled={locked || !paidApproveAvailable}>{busy === 'approved' ? 'Approving…' : 'Yes, approve'}</button>
            </div>
          </div>
        ) : mode === 'choose' ? (
          <div className="cleanup-review-buttons">
            {paid
              ? <button type="button" className="secondary-button" onClick={() => onMode('problem')} disabled={locked || !paidDisputeAvailable}>{paidDisputeAvailable ? 'Report a problem' : 'Dispute unavailable'}</button>
              : <button type="button" className="secondary-button" onClick={() => onMode('changes')} disabled={locked}>Request changes</button>}
            <button type="button" className="primary-button cleanup-review-approve" onClick={paid ? () => onConfirming(true) : onApprove} disabled={locked || (paid && !paidApproveAvailable)}>
              {busy === 'approved' ? 'Approving…' : 'Approve cleanup'}
            </button>
          </div>
        ) : (
          <div className="cleanup-review-buttons">
            <button type="button" className="secondary-button" onClick={() => onMode('choose')} disabled={Boolean(busy)}>Back</button>
            {mode === 'changes'
              ? <button type="button" className="primary-button" onClick={onRequestChanges} disabled={locked}>{busy === 'changes_requested' ? 'Sending…' : 'Send change request'}</button>
              : <button type="button" className="primary-button" onClick={onDispute} disabled={locked || !paidDisputeAvailable}>{busy === 'dispute' ? 'Sending…' : 'Send to Litterbugs team'}</button>}
          </div>
        )}
      </section>
    </div>
  );
}

/** Shown once a decision is saved. */
export function CleanupReviewDone({ kind, children }: { kind: 'approved' | 'changes' | 'dispute'; children: ReactNode }) {
  return (
    <section className="cleanup-review-done" data-kind={kind} role="status">
      {kind === 'approved' && <BugCelebration />}
      <img src={kind === 'approved' ? '/brand/bugs/flower.png' : kind === 'changes' ? '/brand/ranks/caterpillar.svg' : '/brand/bugs/ladybug.png'} alt="" aria-hidden="true" width={34} height={34} />
      <div>
        <h2>{kind === 'approved' ? 'Cleanup approved' : kind === 'changes' ? 'Change request sent' : 'Problem reported'}</h2>
        <p>{children}</p>
      </div>
    </section>
  );
}
