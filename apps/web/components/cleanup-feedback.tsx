'use client';
/* eslint-disable @next/next/no-img-element -- Short-lived signed cleanup evidence URLs. */
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cleanupChangeReasonLabel } from '@/lib/cleanup-review';
import { useDataRefresh } from '@/lib/use-data-refresh';

type Feedback = { reasons: string[]; note: string | null; photos: string[] };
export function CleanupFeedback({ cleanupId }: { cleanupId: string }) {
  const refresh = useDataRefresh();
  const [retry, setRetry] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const client = createClient();
      const { data: review, error } = await client.from('cleanup_reviews')
        .select('submission_id, reason_codes, note').eq('cleanup_attempt_id', cleanupId)
        .eq('decision', 'changes_requested').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error || !review) throw new Error('Feedback unavailable');
      const photos = await client.from('cleanup_submission_photos').select('storage_path')
        .eq('submission_id', review.submission_id).order('display_order');
      if (photos.error) throw photos.error;
      const urls = await Promise.all((photos.data ?? []).map(async photo => {
        const result = await client.storage.from('cleanup_photos').createSignedUrl(photo.storage_path, 3600);
        return result.data?.signedUrl ?? '';
      }));
      if (!cancelled) { setError(false); setFeedback({ reasons: review.reason_codes ?? [], note: review.note, photos: urls.filter(Boolean) }); }
    }
    void load().catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [cleanupId, refresh, retry]);
  return <section className="cleanup-feedback" aria-label="Cleanup correction feedback">
    <h3>What needs changing</h3>
    {error ? <><p role="alert">Feedback could not be loaded.</p><button className="secondary-button" onClick={() => setRetry(value => value + 1)}>Retry feedback</button></> : !feedback ? <p role="status">Loading feedback…</p> : <>
      <ul>{feedback.reasons.map(reason => <li key={reason}>{cleanupChangeReasonLabel(reason)}</li>)}</ul>
      {feedback.note && <p className="cleanup-legal-copy">{feedback.note}</p>}
      {!!feedback.photos.length && <details><summary>Previous evidence</summary><div className="cleanup-evidence-grid">{feedback.photos.map((src, index) => <img key={src} src={src} alt={`Previously submitted cleanup photo ${index + 1}`} />)}</div></details>}
      <p>Update the photos and description below before the correction deadline.</p>
    </>}
  </section>;
}
