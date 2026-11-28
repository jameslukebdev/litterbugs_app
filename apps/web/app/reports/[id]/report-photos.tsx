'use client';

/* eslint-disable @next/next/no-img-element -- The route delivers bounded JPEGs and rechecks visibility on every request. */
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import type { publicReportPhotoDescription } from '@/lib/public-report-content';
import styles from './report-share.module.css';

type PhotoDescription = ReturnType<typeof publicReportPhotoDescription>;
type Photo = PhotoDescription & { url: string; count: number };
type Enlarged = { photo: Photo; slides: number[]; position: number };

/** Address of the Nth photo of a kind, optionally at the smaller width. */
function photoSrc(url: string, index: number, small = false) {
  const query = [small ? 'width=640' : '', index ? `photo=${index}` : ''].filter(Boolean).join('&');
  return query ? `${url}?${query}` : url;
}

const photoAlt = (photo: Photo, position: number, total: number) =>
  total > 1 ? `${photo.alt} (photo ${position + 1} of ${total})` : photo.alt;

/**
 * Every photo of one kind. All of them are in the page (so they are readable
 * without scripts and indexable); with more than one, the frame becomes a
 * swipeable strip with the same arrows and dots as the report cards.
 */
function PhotoSet({ photo, onMissing, onEnlarge }: { photo: Photo; onMissing: () => void; onEnlarge: (view: Enlarged) => void }) {
  const strip = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<number[]>([]);
  const slides = Array.from({ length: Math.max(1, photo.count) }, (_, index) => index).filter(index => !failed.includes(index));
  const many = slides.length > 1;
  const step = (by: number) => {
    const element = strip.current;
    if (!element) return;
    const next = (active + by + slides.length) % slides.length;
    element.scrollTo({ left: next * element.clientWidth });
  };

  return (
    <div className={`${styles.photoFrame} ${many ? styles.gallery : ''}`}>
      <div className={styles.strip} ref={strip}
        onScroll={event => setActive(Math.round(event.currentTarget.scrollLeft / Math.max(1, event.currentTarget.clientWidth)))}>
        {slides.map((index, position) => (
          <button type="button" className={styles.slide} key={index}
            aria-label={`Enlarge ${photo.label.toLowerCase()}${many ? ` ${position + 1} of ${slides.length}` : ''}`}
            onClick={() => onEnlarge({ photo, slides, position })}>
            <img src={photoSrc(photo.url, index)} width={1080} height={810}
              alt={photoAlt(photo, position, slides.length)}
              loading={position === 0 ? undefined : 'lazy'}
              sizes="(max-width: 700px) calc(100vw - 40px), 480px"
              srcSet={`${photoSrc(photo.url, index, true)} 640w, ${photoSrc(photo.url, index)} 1080w`}
              // Losing the first photo removes the whole set; a later one just drops out of the strip.
              onError={() => index === 0 ? onMissing() : setFailed(current => [...current, index])} />
          </button>
        ))}
      </div>
      {many && <>
        <div className={styles.photoNav}>
          <button type="button" aria-label={`Previous ${photo.label.toLowerCase()} photo`} onClick={() => step(-1)}><Icon name="chevron-left" /></button>
          <button type="button" aria-label={`Next ${photo.label.toLowerCase()} photo`} onClick={() => step(1)}><Icon name="chevron-right" /></button>
        </div>
        <span className={styles.photoDots} aria-hidden="true">{slides.map((index, position) => <i key={index} data-active={position === active ? '' : undefined} />)}</span>
        <span className="sr-only" aria-live="polite">Photo {active + 1} of {slides.length}</span>
      </>}
    </div>
  );
}

/** The tapped photo, whole and as large as the screen allows. A native dialog gives Escape and focus handling. */
function EnlargedPhoto({ view, onChange, onClose }: { view: Enlarged; onChange: (view: Enlarged) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const total = view.slides.length;
  const step = (by: number) => onChange({ ...view, position: (view.position + by + total) % total });
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal?.();
  }, []);
  return (
    <dialog ref={dialog} className={styles.enlarged} aria-label={photoAlt(view.photo, view.position, total)}
      onClose={onClose}
      // A click on the dark surround (the dialog itself, not its contents) closes it.
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={event => {
        if (total > 1 && event.key === 'ArrowLeft') step(-1);
        if (total > 1 && event.key === 'ArrowRight') step(1);
      }}>
      <img key={view.slides[view.position]} src={photoSrc(view.photo.url, view.slides[view.position])}
        alt={photoAlt(view.photo, view.position, total)} />
      <button type="button" className={styles.enlargedClose} aria-label="Close photo" onClick={onClose}><Icon name="close" /></button>
      {total > 1 && <>
        <button type="button" className={`${styles.enlargedStep} ${styles.enlargedPrevious}`} aria-label="Previous photo" onClick={() => step(-1)}><Icon name="chevron-left" /></button>
        <button type="button" className={`${styles.enlargedStep} ${styles.enlargedNext}`} aria-label="Next photo" onClick={() => step(1)}><Icon name="chevron-right" /></button>
        <p className={styles.enlargedCount} aria-live="polite">{view.photo.label} · {view.position + 1} of {total}</p>
      </>}
    </dialog>
  );
}

export function ReportPhotos({ beforePhotoUrl, afterPhotoUrl, beforeDescription, afterDescription, beforeCount = 1, afterCount = 1 }: {
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  beforeDescription: PhotoDescription;
  afterDescription: PhotoDescription;
  beforeCount?: number;
  afterCount?: number;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const [enlarged, setEnlarged] = useState<Enlarged | null>(null);
  const photos = [
    { url: beforePhotoUrl, count: beforeCount, ...beforeDescription },
    { url: afterPhotoUrl, count: afterCount, ...afterDescription },
  ].filter((photo): photo is Photo => Boolean(photo.url) && !failed.includes(photo.url!));

  if (!photos.length) return null;
  return (
    <div className={`${styles.photos} ${photos.length === 1 ? styles.singlePhoto : ''}`}>
      {photos.map(photo => (
        <figure className={styles.photo} key={photo.url}>
          <PhotoSet photo={photo} onEnlarge={setEnlarged} onMissing={() => setFailed(current => [...current, photo.url])} />
          {/* One photo needs no label: the page header already gives its date. */}
          {photos.length > 1 && <figcaption className={styles.photoLabel}><strong>{photo.label}</strong><span>{photo.caption}</span></figcaption>}
        </figure>
      ))}
      {enlarged && <EnlargedPhoto view={enlarged} onChange={setEnlarged} onClose={() => setEnlarged(null)} />}
    </div>
  );
}
