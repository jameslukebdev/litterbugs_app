'use client';

/* eslint-disable @next/next/no-img-element -- Signed Supabase URLs are short-lived runtime images. */

import { useEffect, useRef, useState } from 'react';
import type { Report } from '@litterbugs/report-contract';

import { CleanupAction } from '@/components/cleanup-action';
import { CleanupReviewAction } from '@/components/cleanup-review-action';
import { FundingContributionAction } from '@/components/funding-contribution-action';
import { Icon } from '@/components/icon';
import { PayoutSetupAction } from '@/components/payout-setup-action';
import { ReportShareDialog } from '@/components/report-share-dialog';
import { isPubliclyShareableReport } from '@/lib/public-report-share-model';
import { getReportCardPhotoUrl, getReportDetailPhotoUrl, getWebCompatibleReportPhotoUrl } from '@/lib/report-photo';
import { createClient } from '@/lib/supabase/client';

const formatUsd = (cents: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(cents / 100);

const formatDate = (value: string) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(value));

function cleanupStatusLabel(status: string) {
  if (status === 'claimed') return 'Cleanup in progress';
  if (status === 'completion_submitted') return 'Cleanup photos under review';
  if (status === 'changes_requested') return 'Cleaner is updating photos';
  if (status === 'completed') return 'Cleanup complete';
  return 'Available to clean';
}

export function ReportDetail({
  report,
  isOwner,
  onClose,
  onEdit,
  onDelete,
  userId = null,
  onRequireSignIn,
  onReportChanged,
  favorite = false,
  hidden = false,
  onFavoriteChange,
  onHiddenChange,
  onNotify,
}: {
  report: Report;
  isOwner: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  userId?: string | null;
  onRequireSignIn?: () => void;
  onReportChanged?: () => void | Promise<void>;
  favorite?: boolean;
  hidden?: boolean;
  onFavoriteChange?: (favorite: boolean) => void;
  onHiddenChange?: (hidden: boolean) => void;
  onNotify?: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [signedPhoto, setSignedPhoto] = useState<{ path: string; src: string | null; failed: boolean }>({ path: '', src: null, failed: false });
  const [renderedPhoto, setRenderedPhoto] = useState<{ path: string; loaded: boolean; failed: boolean }>({ path: '', loaded: false, failed: false });
  const [renderedPreview, setRenderedPreview] = useState<{ path: string; loaded: boolean; failed: boolean }>({ path: '', loaded: false, failed: false });
  const [actionStatus, setActionStatus] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const photoPaths = report.photo_paths ?? [];
  const displayedPhotoIndex = photoPaths.length ? photoIndex % photoPaths.length : 0;
  const currentPhotoPath = photoPaths[displayedPhotoIndex];
  const detailPhotoUrl = currentPhotoPath ? getReportDetailPhotoUrl(currentPhotoPath) : null;
  const previewPhotoUrl = currentPhotoPath ? getReportCardPhotoUrl(currentPhotoPath) : null;
  const compatibilityUrl = currentPhotoPath
    ? getWebCompatibleReportPhotoUrl(currentPhotoPath)
    : null;
  const currentSignedPhoto = signedPhoto.path === currentPhotoPath ? signedPhoto : null;
  const currentRenderedPhoto = renderedPhoto.path === currentPhotoPath ? renderedPhoto : null;
  const currentRenderedPreview = renderedPreview.path === currentPhotoPath ? renderedPreview : null;
  const photoSrc = detailPhotoUrl ?? compatibilityUrl ?? currentSignedPhoto?.src ?? null;
  const photoLoaded = currentRenderedPhoto?.loaded ?? false;
  const photoFailed = currentRenderedPhoto?.failed || currentSignedPhoto?.failed || false;
  const previewLoaded = currentRenderedPreview?.loaded ?? false;
  const previewFailed = currentRenderedPreview?.failed ?? false;

  useEffect(() => {
    let cancelled = false;

    async function loadPhotoSource() {
      if (!currentPhotoPath || detailPhotoUrl || compatibilityUrl) return;

      const { data, error } = await createClient().storage
        .from('report_photos')
        .createSignedUrl(currentPhotoPath, 60 * 60);

      if (!cancelled) {
        setSignedPhoto({
          path: currentPhotoPath,
          src: data?.signedUrl ?? null,
          failed: Boolean(error || !data?.signedUrl),
        });
      }
    }

    void loadPhotoSource();
    return () => { cancelled = true; };
  }, [compatibilityUrl, currentPhotoPath, detailPhotoUrl]);

  const severity = report.severity ?? 'Medium';
  const hasLitterTypes = Boolean(report.litter_types?.length || report.types);
  const shareable = isPubliclyShareableReport(report);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    backButtonRef.current?.focus();

    function isTopmostDialog() {
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'));
      return dialogs.at(-1) === dialogRef.current;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!isTopmostDialog()) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    if (!actionStatus) return;
    const timeout = window.setTimeout(() => setActionStatus(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [actionStatus]);

  function notify(message: string) {
    setActionStatus(message);
    onNotify?.(message);
  }

  async function shareReport() {
    const url = new URL(`/reports/${encodeURIComponent(report.id)}`, window.location.origin);
    const title = report.title || 'Litter report';
    const prefersNativeShare = typeof navigator.share === 'function'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(pointer: coarse)').matches;

    try {
      if (prefersNativeShare) {
        await navigator.share({ title, text: `View this cleanup report on Litterbugs.`, url: url.toString() });
        notify('Report shared.');
      } else {
        setShareUrl(url.toString());
        setShareDialogOpen(true);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      notify('The report link could not be shared.');
    }
  }

  function closeShareDialog() {
    setShareDialogOpen(false);
    window.requestAnimationFrame(() => shareButtonRef.current?.focus());
  }

  return (
    <div className="report-detail-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside
        ref={dialogRef}
        className={`report-detail${photoPaths.length ? '' : ' report-detail-without-photo'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-detail-title"
      >
        <div className="sheet-handle" aria-hidden />
        <header className="report-detail-toolbar">
          <button ref={backButtonRef} type="button" className="report-detail-toolbar-back" onClick={onClose}>
            <Icon name="chevron-left" />
            <span>Back to search</span>
          </button>
          <img className="report-detail-toolbar-logo" src="/brand/litterbugs-logo.png" alt="" aria-hidden />
          <nav className="report-detail-toolbar-actions" aria-label="Report actions">
            <button type="button" aria-pressed={favorite} onClick={() => onFavoriteChange?.(!favorite)}>
              <Icon name="heart" />
              <span>{favorite ? 'Saved' : 'Favorite'}</span>
            </button>
            {shareable && (
              <button
                ref={shareButtonRef}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={shareDialogOpen}
                onClick={() => { void shareReport(); }}
              >
                <Icon name="share" />
                <span>Share</span>
              </button>
            )}
            <button type="button" aria-pressed={hidden} onClick={() => onHiddenChange?.(!hidden)}>
              <Icon name="eye-off" />
              <span>{hidden ? 'Hidden' : 'Hide'}</span>
            </button>
          </nav>
          {actionStatus && <span className="report-detail-toolbar-status" role="status">{actionStatus}</span>}
        </header>
        <div className="report-detail-layout">
          <div className="report-detail-visual">
            <div className="report-photo-region">
              {photoPaths.length ? (
                <>
                  {previewPhotoUrl && !photoLoaded && !previewFailed && (
                    <img
                      className={`report-photo report-photo-preview${previewLoaded ? ' report-photo-preview-loaded' : ''}`}
                      src={previewPhotoUrl}
                      alt=""
                      aria-hidden="true"
                      decoding="async"
                      onLoad={() => setRenderedPreview({ path: currentPhotoPath, loaded: true, failed: false })}
                      onError={() => setRenderedPreview({ path: currentPhotoPath, loaded: false, failed: true })}
                    />
                  )}
                  {photoSrc && !photoFailed && (
                    <img
                      className={`report-photo${photoLoaded ? '' : ' report-photo-loading'}`}
                      src={photoSrc}
                      alt={`Report photo ${displayedPhotoIndex + 1} of ${photoPaths.length}`}
                      decoding="async"
                      fetchPriority="high"
                      onLoad={() => setRenderedPhoto({ path: currentPhotoPath, loaded: true, failed: false })}
                      onError={() => setRenderedPhoto({ path: currentPhotoPath, loaded: false, failed: true })}
                    />
                  )}
                  {!photoLoaded && !previewLoaded && (
                    <div className="photo-placeholder photo-placeholder-overlay">
                      {photoFailed ? <><Icon name="image" /><strong>Photo unavailable</strong><span>This photo could not be displayed.</span></> : <><span className="spinner" /><span>Loading photo…</span></>}
                    </div>
                  )}
                  {photoPaths.length > 1 && (
                    <>
                      <button className="photo-arrow photo-previous" onClick={() => setPhotoIndex((displayedPhotoIndex - 1 + photoPaths.length) % photoPaths.length)} aria-label="Previous photo"><Icon name="chevron-left" /></button>
                      <button className="photo-arrow photo-next" onClick={() => setPhotoIndex((displayedPhotoIndex + 1) % photoPaths.length)} aria-label="Next photo"><Icon name="chevron-right" /></button>
                      <span className="photo-count">{displayedPhotoIndex + 1}/{photoPaths.length}</span>
                    </>
                  )}
                </>
              ) : (
                <div className="photo-placeholder"><Icon name="image" /><strong>No photo added</strong><span>This report was submitted without a photo.</span></div>
              )}
            </div>
          </div>

          <div className="report-detail-panel">
            <div className="report-detail-scroll">
              <header className="report-detail-header">
                <h2 id="report-detail-title">{report.title || 'Litter Report'}</h2>
                <div className="report-summary-line">
                  <span className={`report-detail-severity report-detail-severity-${severity.toLowerCase()}`}><span />{severity}</span>
                  {report.created_at && <span>{formatDate(report.created_at)}</span>}
                  {report.expires_at && <span>Expires {formatDate(report.expires_at)}</span>}
                </div>
                <div className="report-status-row">
                  <span>{cleanupStatusLabel(report.cleanup_state)}</span>
                  {report.funded_amount_cents > 0 && <strong>{formatUsd(report.funded_amount_cents)} reward</strong>}
                </div>
              </header>

              <div className="report-detail-body">
                {hasLitterTypes && <p className="report-detail-fact"><strong>Litter</strong><span>{[...(report.litter_types ?? []), ...(report.types ? [report.types] : [])].join(', ')}</span></p>}
                {!!report.notes_presets?.length && <p className="report-detail-fact"><strong>Notes</strong><span>{report.notes_presets.join(', ')}</span></p>}
                {report.notes_other && <p className="report-detail-fact"><strong>Details</strong><span>{report.notes_other}</span></p>}
              </div>
            </div>

            <footer className="report-detail-footer">
              {isOwner && !report.funding_locked_at && <button className="danger-button compact-button" onClick={onDelete}><Icon name="trash" />Delete</button>}
              {isOwner && !report.funding_locked_at && <button className="secondary-button compact-button" onClick={onEdit}><Icon name="edit" />Edit</button>}
              <CleanupReviewAction report={report} userId={userId} isOwner={isOwner} onChanged={onReportChanged} />
              <FundingContributionAction report={report} userId={userId} onRequireSignIn={onRequireSignIn} onChanged={onReportChanged} />
              {userId && report.funded_amount_cents > 0 && report.cleanup_state !== 'completed' && <PayoutSetupAction compact />}
              <CleanupAction report={report} userId={userId} onRequireSignIn={onRequireSignIn} onChanged={onReportChanged} />
            </footer>
          </div>
        </div>
        <ReportShareDialog
          open={shareDialogOpen}
          report={report}
          previewPhotoUrl={previewPhotoUrl}
          shareUrl={shareUrl}
          onClose={closeShareDialog}
          onShared={() => notify('Report shared.')}
        />
      </aside>
    </div>
  );
}
