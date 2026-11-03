'use client';

/* eslint-disable @next/next/no-img-element -- The route delivers bounded JPEGs and rechecks visibility on every request. */
import { useState } from 'react';
import type { publicReportPhotoDescription } from '@/lib/public-report-content';
import styles from './report-share.module.css';

type PhotoDescription = ReturnType<typeof publicReportPhotoDescription>;
export function ReportPhotos({ beforePhotoUrl, afterPhotoUrl, beforeDescription, afterDescription }: {
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  beforeDescription: PhotoDescription;
  afterDescription: PhotoDescription;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const photos = [
    { url: beforePhotoUrl, ...beforeDescription },
    { url: afterPhotoUrl, ...afterDescription },
  ].filter((photo): photo is typeof photo & { url: string } => Boolean(photo.url) && !failed.includes(photo.url!));

  if (!photos.length) return null;
  return (
    <div className={`${styles.photos} ${photos.length === 1 ? styles.singlePhoto : ''}`}>
      {photos.map(photo => (
        <figure className={styles.photo} key={photo.url}>
          <div className={styles.photoFrame}>
            <img src={photo.url} alt={photo.alt} width={1080} height={810}
              sizes="(max-width: 700px) calc(100vw - 40px), 480px"
              srcSet={`${photo.url}?width=640 640w, ${photo.url} 1080w`}
              onError={() => setFailed(current => [...current, photo.url])} />
          </div>
          <figcaption className={styles.photoLabel}><strong>{photo.label}</strong><span>{photo.caption}</span></figcaption>
        </figure>
      ))}
    </div>
  );
}
