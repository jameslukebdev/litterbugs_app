'use client';
import { useEffect, useState } from 'react';
import { FiChevronRight } from 'react-icons/fi';
import type { Report } from '@litterbugs/report-contract';
import { reportDiscoveryWindow } from '@/lib/report-visibility';
import { createClient } from '@/lib/supabase/client';
import styles from './member-reports.module.css';

type ReportView = 'active' | 'completed';
type ReportResult = {
  view: ReportView;
  rows: Pick<Report, 'id' | 'title' | 'severity'>[];
  more: boolean;
};

export function MemberReports({ profileId }: { profileId: string }) {
  const [view, setView] = useState<ReportView>('active');
  const [result, setResult] = useState<ReportResult>();
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let query = createClient().from('reports').select('id,title,severity')
      .eq('user_id', profileId).eq('is_sample', false).eq('is_published', true).is('cancelled_at', null);
    query = view === 'completed' ? query.eq('cleanup_state', 'completed') : query
      .in('cleanup_state', ['available', 'claimed', 'completion_submitted', 'changes_requested'])
      .is('expired_at', null).or(reportDiscoveryWindow());
    void query.order('created_at', { ascending: false }).order('id', { ascending: false }).range(page * 30, page * 30 + 30)
      .then(({ data, error }) => {
        if (cancelled) return;
        setError(Boolean(error));
        setLoading(false);
        if (error) return;
        const rows = (data ?? []).slice(0, 30);
        setResult(previous => ({
          view,
          rows: page > 0 && previous?.view === view ? [...previous.rows, ...rows] : rows,
          more: (data?.length ?? 0) > 30,
        }));
      });
    return () => { cancelled = true; };
  }, [profileId, view, page, retry]);
  function selectView(value: ReportView) {
    if (value === view) return;
    setView(value);
    setPage(0);
    setError(false);
    setLoading(true);
  }

  const displayed = result?.view === view || loading ? result : undefined;
  const switching = Boolean(displayed && displayed.view !== view);

  return <section className={styles.reports}><h3>Reports</h3>
    <div className={styles.tabs} role="group" aria-label="Member reports">
      {(['active', 'completed'] as const).map(value => <button type="button" key={value} aria-pressed={value === view} onClick={() => selectView(value)}>{value === 'active' ? 'Active reports' : 'Completed reports'}</button>)}
    </div>
    <div className={styles.stage}>
      <div className={styles.results} data-switching={switching || undefined} inert={switching} aria-hidden={switching || undefined} aria-busy={loading}>
        {displayed?.rows.map(report => <a key={report.id} className={styles.report} href={`/map?report=${encodeURIComponent(report.id)}`}>
          <span><strong>{report.title || 'Litter report'}</strong><small>{report.severity} severity</small></span>
          <FiChevronRight aria-hidden="true" />
        </a>)}
        {displayed && !displayed.rows.length && <p className="member-empty">No {displayed.view} reports</p>}
        {displayed?.more && !error && <button className="secondary-button" disabled={loading} onClick={() => { setLoading(true); setPage(value => value + 1); }}>Load older reports</button>}
      </div>
      {loading && <p className={displayed && page === 0 ? styles.loadingStatus : undefined} role="status">Loading {view} reports…</p>}
      {error && <button className="secondary-button" onClick={() => { setError(false); setLoading(true); setRetry(value => value + 1); }}>Couldn’t load reports. Retry</button>}
    </div>
  </section>;
}
