'use client';
import { useEffect, useState } from 'react';
import { readDraftComparison, type DraftSummary } from '@/lib/draft-summary';
export function DraftSummaryView({ summary }: { summary: DraftSummary | null }) {
  return summary ? <p><strong>{summary.title}</strong><br />{summary.photos} photo{summary.photos === 1 ? '' : 's'}<br />{summary.detail && <span>{summary.detail.slice(0, 200)}<br /></span>}{summary.savedAt ? <>{summary.savedOn === 'account' ? 'Account' : 'Device'} saved {new Date(summary.savedAt).toLocaleString()}</> : 'Device save time unavailable'}</p> : <p>No current saved version.</p>;
}
export function DraftComparison({ userId, draftKey }: { userId: string; draftKey: string }) {
  const [versions, setVersions] = useState<Awaited<ReturnType<typeof readDraftComparison>>>();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void readDraftComparison(userId, draftKey).then(value => { if (active) setVersions(value); }).catch(() => { if (active) setError('Draft summaries could not load. Reconnect before choosing a version.'); });
    return () => { active = false; };
  }, [userId, draftKey]);
  return <><p>Choosing a version replaces the other version’s complete details and photos. Changes are not merged.</p>{error ? <p role="alert">{error}</p> : versions ? <div className="draft-comparison"><section><h3>This device</h3><DraftSummaryView summary={versions.device} /></section><section><h3>Your account</h3><DraftSummaryView summary={versions.account} /></section></div> : <p role="status">Checking saved versions…</p>}</>;
}
