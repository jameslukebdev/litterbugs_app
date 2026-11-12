'use client';
import { useState } from 'react';
import { PhotoBatch } from '@/components/photo-batch';
import { PublicPhoto } from '@/components/public-website/public-photo';
import styles from './preview.module.css';

export function PhotoPreview() {
  const [run, setRun] = useState(0);
  return <main className={styles.page}>
    <p className={styles.eyebrow}>Local photo preview</p><h1>Photos, together</h1>
    <p>These three photos arrive at different times. Their spaces stay in place, then the pictures appear together with a soft fade.</p>
    <button onClick={() => setRun(value => value + 1)}>Replay staggered loading</button>
    <PhotoBatch className={styles.photos} showLoader>
      {[0, 1, 2].map(index => <figure key={`${run}:${index}`}>
        <div className={styles.frame}><PublicPhoto src={`/dev-review-preview/photos/image?photo=${index}&run=${run}`} alt={`Example photo ${index + 1}`} width={600} height={400} eager /></div>
        <figcaption>Photo {index + 1}</figcaption>
      </figure>)}
    </PhotoBatch>
  </main>;
}
