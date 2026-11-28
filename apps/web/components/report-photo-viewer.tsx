'use client';

/* eslint-disable @next/next/no-img-element -- Photos may be short-lived signed URLs. */
import { useState } from 'react';
import { ModalShell } from '@/components/modal-shell';

export function PhotoExpandButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return <button type="button" className="photo-expand-button" onClick={onClick} disabled={disabled}><span>View full photo</span></button>;
}

export function ReportPhotoViewer({ number, count, src, alt, previousSrc, loading, failed, onStep, onClose, onRetry }: {
  number: number;
  count: number;
  src?: string | null;
  alt: string;
  previousSrc?: string | null;
  loading: boolean;
  failed?: boolean;
  onStep: (step: number) => void;
  onClose: () => void;
  onRetry?: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);

  function step(direction: number) {
    setZoomed(false);
    onStep(direction);
  }

  return <ModalShell onClose={onClose} label="Report photo viewer" className="photo-viewer-dialog">
    <h2>Photo {number} of {count}</h2>
    <button type="button" className="secondary-button" onClick={() => setZoomed(value => !value)} disabled={loading || failed}>{zoomed ? 'Fit photo' : 'Zoom in'}</button>
    <div className={`photo-viewer-image${zoomed ? ' zoomed' : ''}`} aria-busy={loading}>
      {previousSrc && previousSrc !== src && <img key={previousSrc} className={`photo-viewer-retained${!loading && !failed ? ' report-photo-loading' : ''}`} src={previousSrc} alt="" aria-hidden="true" />}
      {src && !failed && <img key={src} className={`photo-viewer-current${loading ? ' report-photo-loading' : ''}`} src={src} alt={alt} />}
    </div>
    {loading && <p className="photo-viewer-status" role="status">Loading photo…</p>}
    {failed && <p className="photo-viewer-status" role="status">Photo could not load. {onRetry && <button type="button" className="secondary-button" onClick={onRetry}>Retry photo</button>}</p>}
    {count > 1 && <div className="photo-viewer-controls">
      <button type="button" className="secondary-button" onClick={() => step(-1)}>Previous photo</button>
      <button type="button" className="secondary-button" onClick={() => step(1)}>Next photo</button>
    </div>}
  </ModalShell>;
}
