'use client';

/* eslint-disable @next/next/no-img-element -- The route delivers bounded JPEGs and rechecks visibility on every request. */
import { useState } from 'react';
import styles from './report-share.module.css';

export function ReportPhotos({ beforePhotoUrl, afterPhotoUrl, completed }: {
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  completed: boolean;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const photos = [
    { url: afterPhotoUrl, alt: 'Location after the cleanup', label: 'After' },
    { url: beforePhotoUrl, alt: completed ? 'Location before the cleanup' : 'Reported litter', label: completed ? 'Before' : 'Report photo' },
  ].filter((photo): photo is { url: string; alt: string; label: string } => Boolean(photo.url) && !failed.includes(photo.url!));

  if (!photos.length) return null;
  return (
    <div className={`${styles.photos} ${photos.length === 1 ? styles.singlePhoto : ''}`}>
      {photos.map(photo => (
        <div className={styles.photo} key={photo.url}>
          <img src={photo.url} alt={photo.alt} onError={() => setFailed(current => [...current, photo.url])} />
          <span className={styles.photoLabel}>{photo.label}</span>
        </div>
      ))}
    </div>
  );
}
