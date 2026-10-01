'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { readDraftComparison, type DraftSummary } from '@/lib/draft-summary';
export function DraftSummaryView({ summary, expanded = false }: { summary: DraftSummary | null; expanded?: boolean }) {
  return summary ? <div className="draft-summary"><p><strong>{summary.title}</strong><br />{summary.photos} photo{summary.photos === 1 ? '' : 's'}<br />{summary.detail && <span>{summary.detail}<br /></span>}{summary.savedAt ? <>{summary.savedOn === 'account' ? 'Account' : 'Device'} saved {new Date(summary.savedAt).toLocaleString()}</> : 'Device save time unavailable'}</p>{expanded && summary.fields && <ul>{summary.fields.map(field => <li key={field}>{field}</li>)}</ul>}</div> : <p>No current saved version.</p>;
}
export function DraftComparison({ userId, draftKey, actions }: { userId: string; draftKey: string; actions?: (ready: boolean) => ReactNode }) {
  const [result, setResult] = useState<{ owner: string; key: string; versions?: Awaited<ReturnType<typeof readDraftComparison>>; error?: string }>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void readDraftComparison(userId, draftKey).then(versions => { if (active) setResult({ owner: userId, key: draftKey, versions }); }).catch(() => { if (active) setResult({ owner: userId, key: draftKey, error: 'Draft summaries could not load. Reconnect and retry before choosing a version.' }); });
    return () => { active = false; };
  }, [userId, draftKey, retry]);
  const current = result?.owner === userId && result.key === draftKey ? result : undefined;
  return <><p>Choosing a version replaces the other version’s complete details and photos. Changes are not merged.</p>{current?.error ? <p role="alert">{current.error} <button className="secondary-button" onClick={() => { setResult(undefined); setRetry(value => value + 1); }}>Retry comparison</button></p> : current?.versions ? <><div className="draft-comparison"><section><h3>This device</h3><DraftSummaryView expanded summary={current.versions.device} /></section><section><h3>Your account</h3><DraftSummaryView expanded summary={current.versions.account} /></section></div><p>The same photo count does not mean the photos are identical. Choose the complete version you intend to keep.</p></> : <p role="status">Checking saved versions…</p>}{actions?.(Boolean(current?.versions))}</>;
}
