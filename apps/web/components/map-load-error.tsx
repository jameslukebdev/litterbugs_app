'use client';

import Image from 'next/image';
import { IoGridOutline, IoReloadOutline } from 'react-icons/io5';
import styles from './map-load-error.module.css';

export function MapLoadError({ message, onRetry, onBrowse }: {
  message: string;
  onRetry: () => void;
  onBrowse: () => void;
}) {
  return <div className={`map-error ${styles.recovery}`}>
    <Image src="/brand/ranks/caterpillar.svg" width={48} height={48} alt="" />
    <div className={styles.message} role="status">
      <strong>Map unavailable</strong>
      <span>{message}</span>
    </div>
    <div className={styles.actions}>
      <button type="button" className={styles.retry} onClick={onRetry}><IoReloadOutline aria-hidden />Try again</button>
      <button type="button" aria-controls="active-report-list" onClick={onBrowse}><IoGridOutline aria-hidden />Browse reports</button>
    </div>
  </div>;
}
