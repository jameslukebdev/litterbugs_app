'use client';
import { AppLink } from '@/components/app-link';
import { reportContext } from '@/lib/report-context';

import { moveDialogFocus } from '@/lib/dialog-focus';
import Link from 'next/link';

/* eslint-disable @next/next/no-img-element -- Signed Supabase URLs are short-lived runtime images. */

import { useEffect, useRef, useState } from 'react';
import type { Report } from '@litterbugs/report-contract';

import { isReportClosed } from '@/lib/report-visibility';
import { ModalShell } from '@/components/modal-shell';
import { CompletedCleanup } from '@/components/completed-cleanup';
import { ReportAuthor } from '@/components/report-author';
import { CleanupAction } from '@/components/cleanup-action';
import { CleanupReviewAction } from '@/components/cleanup-review-action';
import { FundingContributionAction } from '@/components/funding-contribution-action';
import { Icon } from '@/components/icon';
import { PayoutSetupAction } from '@/components/payout-setup-action';
import { ReportShareDialog } from '@/components/report-share-dialog';
import { isPubliclyShareableReport } from '@/lib/public-report-share-model';
import { reportShareCopy } from '@/lib/report-share-destinations';
import { retryReportPhotoUrl, getReportCardPhotoUrl, getReportDetailPhotoUrl, getWebCompatibleReportPhotoUrl } from '@/lib/report-photo';
import { createClient } from '@/lib/supabase/client';

const EMPTY_PHOTO_PATHS: string[] = [];

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
  embedded = false,
  inline = false,
  taskBase,
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
  embedded?: boolean;
  inline?: boolean;
  taskBase?: string;
  isOwner: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  userId?: string | null;
  onRequireSignIn?: (intent?: 'clean' | 'fund') => void;
  onReportChanged?: () => void | Promise<void>;
  favorite?: boolean;
  hidden?: boolean;
  onFavoriteChange?: (favorite: boolean) => void;
  onHiddenChange?: (hidden: boolean) => void;
  onNotify?: (message: string) => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const [expandedLayout, setExpandedLayout] = useState(false);
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [photoZoomed, setPhotoZoomed] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoRetry, setPhotoRetry] = useState(0);
  type ReadyPhoto = { reportId: string; src: string; index: number };
  const readyPhotoRef = useRef<ReadyPhoto | null>(null);
  const [retainedPhoto, setRetainedPhoto] = useState<ReadyPhoto | null>(null);
  const preloadedPhotos = useRef(new Set<string>());
  const [signedPhoto, setSignedPhoto] = useState<{ path: string; src: string | null; failed: boolean }>({ path: '', src: null, failed: false });
  const [renderedPhoto, setRenderedPhoto] = useState<{ path: string; loaded: boolean; failed: boolean }>({ path: '', loaded: false, failed: false });
  const [renderedPreview, setRenderedPreview] = useState<{ path: string; loaded: boolean; failed: boolean }>({ path: '', loaded: false, failed: false });
  const [actionStatus, setActionStatus] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const photoPaths = report.photo_paths ?? EMPTY_PHOTO_PATHS;
  const displayedPhotoIndex = photoPaths.length ? photoIndex % photoPaths.length : 0;
  const currentPhotoPath = photoPaths[displayedPhotoIndex];
  const detailPhotoUrl = currentPhotoPath ? getReportDetailPhotoUrl(currentPhotoPath, taskBase ? report.id : undefined) : null;
  const previewPhotoUrl = currentPhotoPath ? getReportCardPhotoUrl(currentPhotoPath, taskBase ? report.id : undefined) : null;
  const compatibilityUrl = currentPhotoPath
    ? getWebCompatibleReportPhotoUrl(currentPhotoPath)
    : null;
  const currentSignedPhoto = signedPhoto.path === currentPhotoPath ? signedPhoto : null;
  const currentRenderedPhoto = renderedPhoto.path === currentPhotoPath ? renderedPhoto : null;
  const currentRenderedPreview = renderedPreview.path === currentPhotoPath ? renderedPreview : null;
  const rawPhotoSrc = detailPhotoUrl ?? compatibilityUrl ?? currentSignedPhoto?.src ?? null;
  const photoSrc = rawPhotoSrc ? retryReportPhotoUrl(rawPhotoSrc, photoRetry) : null;
  const photoLoaded = currentRenderedPhoto?.loaded ?? false;
  const photoFailed = currentRenderedPhoto?.failed || currentSignedPhoto?.failed || false;
  const previewLoaded = currentRenderedPreview?.loaded ?? false;
  const previewFailed = currentRenderedPreview?.failed ?? false;
  const retained = retainedPhoto?.reportId === report.id ? retainedPhoto : null;
  const visiblePhotoIndex = !photoLoaded && retained ? retained.index : displayedPhotoIndex;

  function markPhotoReady() {
    if (!photoSrc) return;
    if (!photoLoaded) setRenderedPhoto({ path: currentPhotoPath, loaded: true, failed: false });
    readyPhotoRef.current = { reportId: report.id, src: photoSrc, index: displayedPhotoIndex };
  }

  function selectPhoto(index: number) {
    setRetainedPhoto(readyPhotoRef.current?.reportId === report.id ? readyPhotoRef.current : null);
    setPhotoIndex(index);
    setPhotoZoomed(false);
  }

  useEffect(() => {
    if (photoPaths.length < 2) return;
    const neighbors = [(displayedPhotoIndex + 1) % photoPaths.length, (displayedPhotoIndex + photoPaths.length - 1) % photoPaths.length];
    for (const index of neighbors) {
      const src = getReportDetailPhotoUrl(photoPaths[index], taskBase ? report.id : undefined) ?? getWebCompatibleReportPhotoUrl(photoPaths[index]);
      if (!src || preloadedPhotos.current.has(src)) continue;
      preloadedPhotos.current.add(src);
      const image = new window.Image();
      image.decoding = 'async';
      image.fetchPriority = 'low';
      image.src = src;
    }
  }, [displayedPhotoIndex, photoPaths, report.id, taskBase]);

  useEffect(() => {
    let cancelled = false;

    async function loadPhotoSource() {
      if (!currentPhotoPath || detailPhotoUrl || compatibilityUrl) return;

      try {
        const { data, error } = await createClient().storage
          .from('report_photos')
          .createSignedUrl(currentPhotoPath, 60 * 60);
        if (!cancelled) setSignedPhoto({ path: currentPhotoPath, src: data?.signedUrl ?? null, failed: Boolean(error || !data?.signedUrl) });
      } catch {
        if (!cancelled) setSignedPhoto({ path: currentPhotoPath, src: null, failed: true });
      }
    }

    void loadPhotoSource();
    return () => { cancelled = true; };
  }, [compatibilityUrl, currentPhotoPath, detailPhotoUrl, photoRetry]);

  const [openedAt] = useState(() => Date.now());
  const closed = isReportClosed(report, openedAt);
  const severity = report.severity ?? 'Medium';
  const hasLitterTypes = Boolean(report.litter_types?.length || report.types);
  const shareable = isPubliclyShareableReport(report);
  const shareCopy = reportShareCopy(report);

  useEffect(() => {
    if (embedded) return;
    if (inline && !expandedLayout) {
      const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const panel = dialogRef.current;
      backButtonRef.current?.focus();
      const escape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && !document.querySelector('[role="dialog"]') && dialogRef.current?.contains(document.activeElement)) { event.preventDefault(); closeRef.current(); }
      };
      window.addEventListener('keydown', escape);
      return () => {
        window.removeEventListener('keydown', escape);
        // React may already have removed the focused pane. Preserve focus elsewhere
        // when switching cards instead of pulling it back to the previous card.
        if (previousFocus?.isConnected && (document.activeElement === document.body || panel?.contains(document.activeElement))) previousFocus.focus();
      };
    }
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
        closeRef.current();
        return;
      }

      if (dialogRef.current) moveDialogFocus(dialogRef.current, event);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [embedded, inline, expandedLayout]);

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
    const prefersNativeShare = typeof navigator.share === 'function'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(pointer: coarse)').matches;

    try {
      if (prefersNativeShare) {
        await navigator.share({ title: shareCopy.title, text: shareCopy.message, url: url.toString() });
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
    <div className={embedded ? "report-detail-embedded" : inline && !expandedLayout ? "report-detail-pane report-detail-context" : `report-detail-backdrop${expandedLayout ? ' report-detail-expanded' : ' report-detail-context'}`} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside
        ref={dialogRef}
        className={`report-detail${photoPaths.length ? '' : ' report-detail-without-photo'}`}
        role={embedded || (inline && !expandedLayout) ? "region" : "dialog"}
        aria-modal={embedded || (inline && !expandedLayout) ? undefined : true}
        aria-labelledby="report-detail-title"
      >
        <div className="sheet-handle" aria-hidden />
        <header className="report-detail-toolbar">
          <button ref={backButtonRef} type="button" className="report-detail-toolbar-back" onClick={onClose}>
            <Icon name="chevron-left" />
            <span>Back</span>
          </button>
          {!embedded && <button className="report-layout-toggle" onClick={() => setExpandedLayout(value => !value)} aria-pressed={expandedLayout}>{expandedLayout ? 'Compact view' : 'Larger view'}</button>}
          <img className="report-detail-toolbar-logo" src="/brand/litterbugs-logo.png" alt="" aria-hidden />
          <nav className="report-detail-toolbar-actions" aria-label="Report actions">
            {onFavoriteChange && <button type="button" aria-pressed={favorite} onClick={() => onFavoriteChange?.(!favorite)}>
              <Icon name="heart" />
              <span>{favorite ? 'Saved' : 'Favorite'}</span>
            </button>}
            {shareable && (
              <button
                ref={shareButtonRef}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={shareDialogOpen}
                onClick={() => { void shareReport(); }}
              >
                <Icon name="share" />
                <span>{shareCopy.actionLabel}</span>
              </button>
            )}
            {onHiddenChange && <button type="button" aria-pressed={hidden} onClick={() => onHiddenChange?.(!hidden)}>
              <Icon name="eye-off" />
              <span>{hidden ? 'Hidden' : 'Hide'}</span>
            </button>}
          </nav>
          {actionStatus && <span className="report-detail-toolbar-status" role="status">{actionStatus}</span>}
        </header>
        <div className="report-detail-layout">
              <header className="report-detail-header">
                  <h2 id="report-detail-title">{report.title || 'Litter Report'}</h2><p className="report-context">{reportContext(report)}</p>
                <div className="report-summary-line">
                  <span className={`report-detail-severity report-detail-severity-${severity.toLowerCase()}`}><span />{severity}</span>
                  {report.created_at && <span>{formatDate(report.created_at)}</span>}
                  {!closed && report.cleanup_state === 'available' && report.expires_at && <span>Expires {formatDate(report.expires_at)}</span>}
                </div>
                <div className="report-status-row">
                  <span>{closed ? 'Report closed' : cleanupStatusLabel(report.cleanup_state)}</span>
                  {report.cleanup_state !== 'completed' && report.funded_amount_cents > 0 && <strong>{formatUsd(report.funded_amount_cents)} reward</strong>}
                </div>
                <AppLink reportId={report.id} className="report-open-app">Open in app ↗</AppLink>
              </header>
          <div className="report-detail-visual">
            <div className="report-photo-region" aria-busy={photoPaths.length > 0 && !photoLoaded && !photoFailed}>
              {photoSrc && (photoLoaded || retained) && !photoFailed && <button disabled={!photoLoaded} className="photo-expand-button" onClick={() => { setPhotoExpanded(true); setPhotoZoomed(false); }}>View full photo</button>}
              {photoPaths.length ? (
                <>
                  {retained && retained.src !== photoSrc && <img key={retained.src} className={`report-photo report-photo-retained${photoLoaded ? ' report-photo-loading' : ''}`} src={retained.src} alt="" aria-hidden="true" />}
                  {previewPhotoUrl && !retained && !photoLoaded && !previewFailed && (
                    <img
                      key={retryReportPhotoUrl(previewPhotoUrl, photoRetry)}
                      className={`report-photo report-photo-preview${previewLoaded ? ' report-photo-preview-loaded' : ''}`}
                      src={retryReportPhotoUrl(previewPhotoUrl, photoRetry)}
                      alt=""
                      aria-hidden="true"
                      decoding="async"
                      onLoad={() => { setRenderedPreview({ path: currentPhotoPath, loaded: true, failed: false }); if (!photoLoaded) readyPhotoRef.current = { reportId: report.id, src: retryReportPhotoUrl(previewPhotoUrl, photoRetry), index: displayedPhotoIndex }; }}
                      onError={() => setRenderedPreview({ path: currentPhotoPath, loaded: false, failed: true })}
                    />
                  )}
                  {photoSrc && !photoFailed && (
                    <img
                      className={`report-photo${photoLoaded ? '' : ' report-photo-loading'}`}
                      key={photoSrc}
                      src={photoSrc}
                      alt={`Report photo ${displayedPhotoIndex + 1} of ${photoPaths.length}`}
                      decoding="async"
                      fetchPriority="high"
                      ref={node => { if (node?.complete && node.naturalWidth > 0) markPhotoReady(); }}
                      onLoad={markPhotoReady}
                      onError={() => setRenderedPhoto({ path: currentPhotoPath, loaded: false, failed: true })}
                    />
                  )}
                  {photoFailed && !previewLoaded && !retained && <div className="photo-placeholder photo-placeholder-overlay"><Icon name="image" /><strong>Photo unavailable</strong><span>This photo could not be displayed.</span></div>}
                  {photoFailed && <div className="report-photo-recovery" role="status">
                    <span>{retained ? 'Photo could not load. Previous photo shown.' : previewLoaded ? 'Full-size photo unavailable. Preview shown.' : 'Photo could not load.'}</span>
                    <button className="secondary-button compact-button" onClick={() => {
                      setRenderedPhoto({ path: '', loaded: false, failed: false });
                      setRenderedPreview({ path: '', loaded: false, failed: false });
                      setSignedPhoto({ path: '', src: null, failed: false });
                      setPhotoRetry(value => value + 1);
                    }}>Retry photo</button>
                  </div>}
                  {photoPaths.length > 1 && (
                    <>
                      <button className="photo-arrow photo-previous" onClick={() => selectPhoto((displayedPhotoIndex - 1 + photoPaths.length) % photoPaths.length)} aria-label="Previous photo"><Icon name="chevron-left" /></button>
                      <button className="photo-arrow photo-next" onClick={() => selectPhoto((displayedPhotoIndex + 1) % photoPaths.length)} aria-label="Next photo"><Icon name="chevron-right" /></button>
                      <span className="photo-count">{visiblePhotoIndex + 1}/{photoPaths.length}</span>
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



              {report.latitude !== null && report.longitude !== null && <a className="report-directions secondary-button" href={`https://www.google.com/maps/dir/?api=1&destination=${report.latitude},${report.longitude}`} target="_blank" rel="noopener noreferrer"><Icon name="location" />Get directions</a>}
              <div className="report-detail-body">
                {hasLitterTypes && <p className="report-detail-fact"><strong>Litter</strong><span>{[...(report.litter_types ?? []), ...(report.types ? [report.types] : [])].join(', ')}</span></p>}
                {!!report.notes_presets?.length && <p className="report-detail-fact"><strong>Notes</strong><span>{report.notes_presets.join(', ')}</span></p>}
                {report.notes_other && <p className="report-detail-fact"><strong>Details</strong><span>{report.notes_other}</span></p>}
              </div>
              <ReportAuthor profileId={report.user_id} sourceReportId={report.id} onBlocked={() => { onClose(); void onReportChanged?.(); }} />
              {report.cleanup_state === 'completed' && <CompletedCleanup key={report.id} reportId={report.id} />}
            </div>

            <footer className="report-detail-footer">
              {onDelete && isOwner && !closed && report.cleanup_state === 'available' && !report.funding_locked_at && <button className="danger-button compact-button" onClick={onDelete}><Icon name="trash" />Delete</button>}
              {onEdit && isOwner && !closed && report.cleanup_state === 'available' && !report.funding_locked_at && <button className="secondary-button compact-button" onClick={onEdit}><Icon name="edit" />Edit</button>}
              {taskBase && isOwner && !closed && report.cleanup_state === 'completion_submitted' ? <Link className="secondary-button" href={`${taskBase}&task=review`}>Review cleanup</Link> : <CleanupReviewAction report={report} userId={userId} isOwner={isOwner} onChanged={onReportChanged} />}
              <FundingContributionAction report={report} userId={userId} onRequireSignIn={() => onRequireSignIn?.('fund')} onChanged={onReportChanged} />
              {!closed && userId && report.funded_amount_cents > 0 && report.cleanup_state !== 'completed' && <PayoutSetupAction compact />}
              {!closed && (taskBase ? <Link className="primary-button" href={`${taskBase}&task=cleanup`}>Open cleanup workspace</Link> : <CleanupAction report={report} userId={userId} onRequireSignIn={() => onRequireSignIn?.('clean')} onChanged={onReportChanged} />)}
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
        {photoExpanded && photoSrc && <ModalShell onClose={() => setPhotoExpanded(false)} label="Report photo viewer" className="photo-viewer-dialog"><h2>Photo {visiblePhotoIndex + 1} of {photoPaths.length}</h2><button className="secondary-button" onClick={() => setPhotoZoomed(value => !value)}>{photoZoomed ? 'Fit photo' : 'Zoom in'}</button><div className={`photo-viewer-image${photoZoomed ? ' zoomed' : ''}`}><>{retained && retained.src !== photoSrc && <img key={retained.src} className={`photo-viewer-retained${photoLoaded ? ' report-photo-loading' : ''}`} src={retained.src} alt="" aria-hidden="true" />}<img key={photoSrc} className={photoLoaded ? 'photo-viewer-current' : 'photo-viewer-current report-photo-loading'} src={photoSrc} alt={`Report photo ${displayedPhotoIndex + 1}`} /></></div>{photoPaths.length > 1 && <div className="photo-viewer-controls"><button className="secondary-button" onClick={() => { selectPhoto((displayedPhotoIndex + photoPaths.length - 1) % photoPaths.length); }}>Previous photo</button><button className="secondary-button" onClick={() => { selectPhoto((displayedPhotoIndex + 1) % photoPaths.length); }}>Next photo</button></div>}</ModalShell>}
      </aside>
    </div>
  );
}
