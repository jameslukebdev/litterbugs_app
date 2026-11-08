'use client';
/* eslint-disable @next/next/no-img-element -- Resized report photos from our own photo route. */
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/icon';
import { ReportAuthor } from '@/components/report-author';
import styles from './completed-cleanup.module.css';

type Impact = { rewardCents: number; cleanerId: string | null; completedAt: string | null; description: string | null; bags: number | null; weight: number | null; photoPaths: string[] };

/** Resized, cached after-cleanup photo (640px) instead of the full-size original. */
export const afterPhotoUrl = (reportId: string, index: number) => `/reports/${encodeURIComponent(reportId)}/photo/after?photo=${index}&width=640`;

/** Loads and decodes an image fully before it is shown, so it appears all at once (never half-drawn). */
function preload(src: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    // Fully downloaded means it can no longer appear half-drawn. Decoding first avoids a jank frame,
    // but never wait on it for long (browsers pause decoding in background tabs).
    image.onload = () => { void Promise.race([image.decode().catch(() => undefined), new Promise(done => setTimeout(done, 250))]).then(() => resolve()); };
    image.onerror = () => reject(new Error('Photo unavailable'));
    image.src = src;
  });
}

/** After-cleanup photos one at a time. `fill` makes it fill the report's main photo frame. */
export function AfterPhotos({ reportId, paths, fill = false }: { reportId: string; paths: string[]; fill?: boolean }) {
  const [index, setIndex] = useState(0);
  // src actually shown for each photo, and which ones are fully ready.
  const [sources, setSources] = useState<Record<number, string>>({});
  const [ready, setReady] = useState<Record<number, boolean>>({});
  const [failed, setFailed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    // Current photo first, then the rest in the background so arrows feel instant.
    const order = [index, ...paths.map((_, i) => i).filter(i => i !== index)];
    void (async () => {
      for (const i of order) {
        if (cancelled || ready[i] || failed[i]) continue;
        let src = afterPhotoUrl(reportId, i);
        try {
          await preload(src);
        } catch {
          // Not public yet (or the resize failed): fall back to a short-lived signed original.
          const signed = await createClient().storage.from('cleanup_photos').createSignedUrl(paths[i], 3600).catch(() => null);
          src = signed?.data?.signedUrl ?? '';
          if (!src || !(await preload(src).then(() => true, () => false))) {
            if (!cancelled) setFailed(current => ({ ...current, [i]: true }));
            continue;
          }
        }
        if (cancelled) return;
        setSources(current => ({ ...current, [i]: src }));
        setReady(current => ({ ...current, [i]: true }));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the photo set or current photo changes.
  }, [reportId, paths, index]);

  const count = paths.length;
  const go = (step: number) => setIndex(current => (current + step + count) % count);
  return <div className={`${styles.viewer}${fill ? ` ${styles.fill}` : ''}`} aria-busy={!ready[index] && !failed[index]}>
    {ready[index] ? <img className={styles.photo} src={sources[index]} alt={`After-cleanup photo ${index + 1} of ${count}`} />
      : failed[index] ? <div className={styles.unavailable}><Icon name="image" /><span>Photo unavailable</span></div>
      : <div className={styles.placeholder} role="status" aria-label="Loading photo" />}
    {count > 1 && <>
      <button type="button" className={`${styles.arrow} ${styles.previous}`} onClick={() => go(-1)} aria-label="Previous photo"><Icon name="chevron-left" /></button>
      <button type="button" className={`${styles.arrow} ${styles.next}`} onClick={() => go(1)} aria-label="Next photo"><Icon name="chevron-right" /></button>
      <span className={styles.count}>{index + 1}/{count}</span>
    </>}
  </div>;
}

export type CleanupImpactState = { impact: Impact | null; error: boolean; retry: () => void };

/** Loads the finished cleanup once; the report's photo area and the details panel share it. */
export function useCleanupImpact(reportId: string | null): CleanupImpactState {
  const [impact, setImpact] = useState<Impact | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!reportId) return;
    let cancelled = false;
    async function load() {
      if (!reportId) return;
      const client = createClient();
      const { data: attempt, error } = await client.from('cleanup_attempts')
        .select('id,cleaner_id,completed_at,final_submission_id,is_paid,reward_amount_cents').eq('report_id', reportId).eq('status', 'completed')
        .not('final_submission_id', 'is', null).order('completed_at', { ascending: false }).limit(1).maybeSingle();
      if (error || !attempt) throw new Error('Cleanup unavailable');
      const [submission, photos] = await Promise.all([
        client.from('cleanup_submissions').select('description,bags_or_items_removed,weight_pounds').eq('id', attempt.final_submission_id!).eq('cleanup_attempt_id', attempt.id).maybeSingle(),
        client.from('cleanup_submission_photos').select('storage_path').eq('submission_id', attempt.final_submission_id!).order('display_order'),
      ]);
      if (submission.error || photos.error || !submission.data) throw new Error('Evidence unavailable');
      if (!cancelled) setImpact({ rewardCents: attempt.is_paid ? attempt.reward_amount_cents : 0, cleanerId: attempt.cleaner_id, completedAt: attempt.completed_at, description: submission.data.description, bags: submission.data.bags_or_items_removed, weight: submission.data.weight_pounds, photoPaths: (photos.data ?? []).map(photo => photo.storage_path).filter(Boolean) });
    }
    void load().catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [reportId, retry]);
  return { impact, error, retry: () => { setError(false); setRetry(value => value + 1); } };
}

export function CompletedCleanup({ reportId, cleanup, showPhotos = true }: { reportId: string; cleanup?: CleanupImpactState; showPhotos?: boolean }) {
  const own = useCleanupImpact(cleanup ? null : reportId);
  const { impact, error, retry } = cleanup ?? own;
  if (!impact && !error) return <section className={`completed-cleanup-story completed-cleanup-loading ${styles.story}`} aria-busy="true"><h3>{showPhotos ? 'Cleanup complete' : 'About the cleanup'}</h3><p className="sr-only" role="status">Loading cleanup details…</p>{showPhotos && <div className={styles.placeholder} aria-hidden="true" />}</section>;
  return <section className={`completed-cleanup-story ${styles.story}`}>
    {/* In the report sheet the photos sit in the main photo frame, so this panel tells the story only. */}
    <h3>{showPhotos ? 'Cleanup complete' : 'About the cleanup'}</h3>
    {error ? <><p>Cleanup details unavailable.</p><button className="secondary-button" onClick={retry}>Try again</button></> : impact && <>
      {showPhotos && <><h4>After cleanup</h4>
      {impact.photoPaths.length ? <AfterPhotos reportId={reportId} paths={impact.photoPaths} /> : <p>After-cleanup photos unavailable.</p>}</>}
      {impact.cleanerId && <div className={styles.byline}><span>Cleaned by</span><ReportAuthor profileId={impact.cleanerId} /></div>}
      {impact.completedAt && <p>Cleaned {new Date(impact.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
      {impact.rewardCents > 0 && <p className={styles.paid}><img src="/brand/bugs/bee.png" alt="" aria-hidden="true" width={16} height={16} />${(impact.rewardCents / 100).toFixed(2)} paid from the cleanup fund</p>}
      {impact.description && <p>{impact.description}</p>}
      {(impact.bags !== null || impact.weight !== null) && <p className={styles.facts}>
        {impact.bags !== null && <span><strong>{impact.bags}</strong> {impact.bags === 1 ? 'bag or item' : 'bags or items'} removed</span>}
        {impact.weight !== null && <span><strong>{impact.weight} lb</strong> removed</span>}
      </p>}
    </>}
  </section>;
}
