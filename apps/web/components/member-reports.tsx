'use client';
import { useEffect, useState } from 'react';
import type { Report } from '@litterbugs/report-contract';
import { createClient } from '@/lib/supabase/client';

export function MemberReports({ profileId }: { profileId: string }) {
  const [view, setView] = useState<'active' | 'completed'>('active');
  const [rows, setRows] = useState<Pick<Report, 'id' | 'title' | 'severity'>[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let query = createClient().from('reports').select('id,title,severity')
      .eq('user_id', profileId).eq('is_sample', false).eq('is_published', true).is('cancelled_at', null);
    query = view === 'completed' ? query.eq('cleanup_state', 'completed') : query
      .in('cleanup_state', ['available', 'claimed', 'completion_submitted', 'changes_requested'])
      .is('expired_at', null).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
    void query.order('created_at', { ascending: false }).order('id', { ascending: false }).range(page * 30, page * 30 + 30)
      .then(({ data, error }) => {
        if (cancelled) return;
        setError(Boolean(error)); setLoading(false);
        if (!error) { setRows(previous => page === 0 ? (data ?? []).slice(0, 30) : [...previous, ...(data ?? []).slice(0, 30)]); setMore((data?.length ?? 0) > 30); }
      });
    return () => { cancelled = true; };
  }, [profileId, view, page, retry]);
  return <section><h3>Reports</h3>
    <div className="activity-tabs" role="tablist" aria-label="Member reports">{(['active', 'completed'] as const).map(value => <button key={value} role="tab" aria-selected={value === view} onClick={() => { setView(value); setPage(0); setRows([]); setLoading(true); }}>{value === 'active' ? 'Active reports' : 'Completed reports'}</button>)}</div>
    {rows.map(report => <a key={report.id} className="member-activity-row" href={`/?report=${encodeURIComponent(report.id)}`}><span><strong>{report.title || 'Litter report'}</strong><small>{report.severity} severity</small></span></a>)}
    {loading && <p role="status">Loading reports…</p>}
    {!loading && !error && !rows.length && <p className="member-empty">No {view} reports</p>}
    {error && <button className="secondary-button" onClick={() => { setLoading(true); setRetry(value => value + 1); }}>Couldn’t load reports. Retry</button>}
    {more && !error && <button className="secondary-button" disabled={loading} onClick={() => { setLoading(true); setPage(value => value + 1); }}>Load older reports</button>}
  </section>;
}
