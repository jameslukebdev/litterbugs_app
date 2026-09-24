'use client';
/* eslint-disable @next/next/no-img-element -- Short-lived signed evidence URLs. */
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ReportAuthor } from '@/components/report-author';

type Impact = { cleanerId: string | null; completedAt: string | null; description: string | null; bags: number | null; weight: number | null; photos: string[] };
export function CompletedCleanup({ reportId }: { reportId: string }) {
  const [impact, setImpact] = useState<Impact | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const client = createClient();
      const { data: attempt, error } = await client.from('cleanup_attempts')
        .select('id,cleaner_id,completed_at,final_submission_id').eq('report_id', reportId).eq('status', 'completed')
        .not('final_submission_id', 'is', null).order('completed_at', { ascending: false }).limit(1).maybeSingle();
      if (error || !attempt) throw new Error('Cleanup unavailable');
      const [submission, photos] = await Promise.all([
        client.from('cleanup_submissions').select('description,bags_or_items_removed,weight_pounds').eq('id', attempt.final_submission_id!).eq('cleanup_attempt_id', attempt.id).maybeSingle(),
        client.from('cleanup_submission_photos').select('storage_path').eq('submission_id', attempt.final_submission_id!).order('display_order'),
      ]);
      if (submission.error || photos.error || !submission.data) throw new Error('Evidence unavailable');
      const urls = await Promise.all((photos.data ?? []).map(async photo => {
        const result = await client.storage.from('cleanup_photos').createSignedUrl(photo.storage_path, 3600);
        return result.data?.signedUrl ?? '';
      }));
      if (!cancelled) setImpact({ cleanerId: attempt.cleaner_id, completedAt: attempt.completed_at, description: submission.data.description, bags: submission.data.bags_or_items_removed, weight: submission.data.weight_pounds, photos: urls.filter(Boolean) });
    }
    void load().catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [reportId, retry]);
  return <section className="completed-cleanup-story">
    <h3>Cleanup complete</h3>
    {error ? <><p>Cleanup details unavailable.</p><button className="secondary-button" onClick={() => { setError(false); setRetry(value => value + 1); }}>Try again</button></> : !impact ? <p role="status">Loading cleanup details…</p> : <>
      <ReportAuthor profileId={impact.cleanerId} />
      {impact.completedAt && <p>Cleaned {new Date(impact.completedAt).toLocaleDateString()}</p>}
      <p>{impact.description}</p>
      <div className="cleanup-impact-facts">{impact.bags !== null && <span><strong>{impact.bags}</strong> bags/items removed</span>}{impact.weight !== null && <span><strong>{impact.weight} lb</strong> removed</span>}</div>
      <h4>After cleanup</h4>
      <div className="cleanup-after-photos">{impact.photos.map((src, index) => <img key={src} src={src} alt={`After-cleanup photo ${index + 1}`} loading="lazy" />)}</div>
      {!impact.photos.length && <p>After-cleanup photos unavailable.</p>}
    </>}
  </section>;
}
