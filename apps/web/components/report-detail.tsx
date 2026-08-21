'use client';

/* eslint-disable @next/next/no-img-element -- Signed Supabase URLs are short-lived runtime images. */

import { useEffect, useState } from 'react';
import type { Report } from '@litterbugs/report-contract';

import { Icon } from '@/components/icon';
import { createClient } from '@/lib/supabase/client';

export function ReportDetail({
  report,
  isOwner,
  onClose,
  onEdit,
  onDelete,
}: {
  report: Report;
  isOwner: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function signPhotos() {
      if (!report.photo_paths?.length) {
        setPhotoUrls([]);
        setLoadingPhotos(false);
        return;
      }
      const results = await Promise.all(report.photo_paths.map((path) =>
        createClient().storage.from('report_photos').createSignedUrl(path, 60 * 60),
      ));
      if (!cancelled) {
        setPhotoUrls(results.flatMap(({ data }) => data?.signedUrl ? [data.signedUrl] : []));
        setLoadingPhotos(false);
      }
    }

    void signPhotos();
    return () => { cancelled = true; };
  }, [report]);

  const severity = report.severity ?? 'Medium';
  const hasLitterTypes = Boolean(report.litter_types?.length || report.types);

  return (
    <aside className="report-detail" aria-label={`${report.title || 'Litter Report'} details`}>
      <div className="sheet-handle" aria-hidden />
      <button className="icon-button sheet-close" onClick={onClose} aria-label="Close report details"><Icon name="close" /></button>
      <div className="report-detail-scroll">
        <header className="report-detail-header">
          <span className={`severity-pill severity-${severity.toLowerCase()}`}><span className="severity-dot" />{severity} severity</span>
          <h2>{report.title || 'Litter Report'}</h2>
          <div className="report-dates">
            {report.created_at && <span><Icon name="info" /> <span><small>Reported</small>{new Date(report.created_at).toLocaleString()}</span></span>}
            {report.expires_at && <span><Icon name="calendar" /> <span><small>Expires</small>{new Date(report.expires_at).toLocaleDateString()}</span></span>}
          </div>
        </header>

        <div className="report-photo-region">
          {loadingPhotos ? (
            <div className="photo-placeholder"><span className="spinner" /><span>Loading photos…</span></div>
          ) : photoUrls.length ? (
            <>
              <img className="report-photo" src={photoUrls[photoIndex]} alt={`Report photo ${photoIndex + 1} of ${photoUrls.length}`} />
              {photoUrls.length > 1 && (
                <>
                  <button className="photo-arrow photo-previous" onClick={() => setPhotoIndex((photoIndex - 1 + photoUrls.length) % photoUrls.length)} aria-label="Previous photo"><Icon name="chevron-left" /></button>
                  <button className="photo-arrow photo-next" onClick={() => setPhotoIndex((photoIndex + 1) % photoUrls.length)} aria-label="Next photo"><Icon name="chevron-right" /></button>
                  <span className="photo-count">{photoIndex + 1}/{photoUrls.length}</span>
                </>
              )}
            </>
          ) : (
            <div className="photo-placeholder"><Icon name="image" /><strong>No photo added</strong><span>This report was submitted without a photo.</span></div>
          )}
        </div>

        <div className="report-detail-body">
          {hasLitterTypes && <section className="detail-section"><h3><Icon name="trash" />Litter Types</h3><div className="chip-row">{report.litter_types?.map((type) => <span className="detail-chip type-chip" key={type}>{type}</span>)}{report.types && <span className="detail-chip other-chip">{report.types}</span>}</div></section>}
          {!!report.notes_presets?.length && <section className="detail-section"><h3><Icon name="info" />Notes</h3><div className="chip-row">{report.notes_presets.map((note) => <span className="detail-chip note-chip" key={note}>{note}</span>)}</div></section>}
          {report.notes_other && <section className="detail-section"><h3><Icon name="edit" />Additional Details</h3><p className="additional-details">{report.notes_other}</p></section>}
        </div>
      </div>

      <footer className="report-detail-footer">
        {isOwner && <button className="danger-button compact-button" onClick={onDelete}><Icon name="trash" />Delete</button>}
        {isOwner && <button className="secondary-button compact-button" onClick={onEdit}><Icon name="edit" />Edit</button>}
        <button className="primary-button compact-button close-detail-button" onClick={onClose}>Close</button>
      </footer>
    </aside>
  );
}
