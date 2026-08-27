'use client';

/* eslint-disable @next/next/no-img-element -- Signed Supabase URLs are short-lived runtime images. */

import { useEffect, useState } from 'react';
import type { Report } from '@litterbugs/report-contract';

import { CleanupAction } from '@/components/cleanup-action';
import { CleanupReviewAction } from '@/components/cleanup-review-action';
import { Icon } from '@/components/icon';
import { getWebCompatibleReportPhotoUrl } from '@/lib/report-photo';
import { createClient } from '@/lib/supabase/client';

const formatUsd = (cents: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(cents / 100);

const formatDate = (value: string) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
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
}: {
  report: Report;
  isOwner: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  userId?: string | null;
  onRequireSignIn?: () => void;
  onReportChanged?: () => void | Promise<void>;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [signedPhoto, setSignedPhoto] = useState<{ path: string; src: string | null; failed: boolean }>({ path: '', src: null, failed: false });
  const [renderedPhoto, setRenderedPhoto] = useState<{ path: string; loaded: boolean; failed: boolean }>({ path: '', loaded: false, failed: false });
  const photoPaths = report.photo_paths ?? [];
  const displayedPhotoIndex = photoPaths.length ? photoIndex % photoPaths.length : 0;
  const currentPhotoPath = photoPaths[displayedPhotoIndex];
  const compatibilityUrl = currentPhotoPath
    ? getWebCompatibleReportPhotoUrl(currentPhotoPath)
    : null;
  const currentSignedPhoto = signedPhoto.path === currentPhotoPath ? signedPhoto : null;
  const currentRenderedPhoto = renderedPhoto.path === currentPhotoPath ? renderedPhoto : null;
  const photoSrc = compatibilityUrl ?? currentSignedPhoto?.src ?? null;
  const photoLoaded = currentRenderedPhoto?.loaded ?? false;
  const photoFailed = currentRenderedPhoto?.failed || currentSignedPhoto?.failed || false;

  useEffect(() => {
    let cancelled = false;

    async function loadPhotoSource() {
      if (!currentPhotoPath || compatibilityUrl) return;

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
  }, [compatibilityUrl, currentPhotoPath]);

  const severity = report.severity ?? 'Medium';
  const hasLitterTypes = Boolean(report.litter_types?.length || report.types);

  return (
    <aside className="report-detail" aria-label={`${report.title || 'Litter Report'} details`}>
      <div className="sheet-handle" aria-hidden />
      <button className="icon-button sheet-close" onClick={onClose} aria-label="Close report details"><Icon name="close" /></button>
      <div className="report-detail-scroll">
        <header className="report-detail-header">
          <h2>{report.title || 'Litter Report'}</h2>
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

        <div className="report-photo-region">
          {photoPaths.length ? (
            <>
              {photoSrc && !photoFailed && (
                <img
                  className={`report-photo${photoLoaded ? '' : ' report-photo-loading'}`}
                  src={photoSrc}
                  alt={`Report photo ${displayedPhotoIndex + 1} of ${photoPaths.length}`}
                  onLoad={() => setRenderedPhoto({ path: currentPhotoPath, loaded: true, failed: false })}
                  onError={() => setRenderedPhoto({ path: currentPhotoPath, loaded: false, failed: true })}
                />
              )}
              {!photoLoaded && (
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
        <CleanupAction report={report} userId={userId} onRequireSignIn={onRequireSignIn} onChanged={onReportChanged} />
        <button className="primary-button compact-button close-detail-button" onClick={onClose}>Close</button>
      </footer>
    </aside>
  );
}
