'use client';
/* eslint-disable @next/next/no-img-element -- Evidence uses the existing public photo routes. */
import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiChevronDown, FiX } from 'react-icons/fi';
import { EMPTY_REPORT_DRAFT, type ReportDraft } from '@litterbugs/report-contract';
import { ReportWizard } from './report-wizard';
import { createClient } from '@/lib/supabase/client';
import { ReportTimeline, reportTimeline } from '@/app/reports/[id]/report-timeline';
import { reportDateLabel } from '@/lib/public-report-content';
import type { PublicReportShareModel } from '@/lib/public-report-share-model';
import type { ReportSite } from '@/lib/report-site-model';
import { sitePath } from '@/lib/report-site-model';
import { submitSiteReport } from '@/lib/submit-site-report';
import { loadSiteReportPublication } from '@/lib/saved-report-draft';
import { useDataRefresh } from '@/lib/use-data-refresh';
import { ReportLocationError } from '@/lib/report-location-error';
import styles from './report-site-activity.module.css';

// Share only simultaneous public reads; release immediately so later visits stay fresh.
const pendingSites = new Map<string, Promise<ReportSite | null>>();
function fetchSite(reportId: string) {
  let pending = pendingSites.get(reportId);
  if (!pending) {
    pending = fetch(`/api/report-sites/${reportId}`, { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Timeline unavailable');
      return response.json() as Promise<ReportSite | null>;
    }).finally(() => pendingSites.delete(reportId));
    pendingSites.set(reportId, pending);
  }
  return pending;
}

export function SiteTimeline({ site, reportId }: { site: ReportSite; reportId: string }) {
  const heading = useId();
  const latest = site.reports.at(-1)?.id;
  return <section className={styles.timeline} aria-labelledby={heading}>
    <div className={styles.heading}><h2 id={heading}>Timeline</h2><span>{site.completedCount} {site.completedCount === 1 ? 'cleanup' : 'cleanups'}</span></div>
    <ol className={styles.rounds}>{site.reports.map(report => <li key={report.id}>
      <details open={report.id === reportId || report.id === latest}>
        <summary className={styles.round}><span><strong>{reportDateLabel(report.reportDate)}</strong><small>Reported by {report.reporterName || 'Community member'}</small></span><span className={report.state === 'completed' ? styles.cleaned : styles.current}>{report.state === 'completed' ? 'Cleaned' : report.state === 'expired' ? 'Expired' : 'Current report'}</span><FiChevronDown aria-hidden /></summary>
        <ol className={styles.events}>{reportTimeline(report).map((event, index) => <li key={`${event.at}-${index}`}><time dateTime={event.at}>{event.date}</time>
          {report.state === 'completed' && event.at === report.completionDate ? <details className={styles.evidence}><summary>{event.label}<FiChevronDown aria-hidden /></summary><div>
            <div className={styles.photos}>{([['before', report.beforePhotoUrl], ['after', report.afterPhotoUrl]] as const).map(([side, src]) => src ? <a key={side} href={src} target="_blank" rel="noopener noreferrer"><img src={src} alt={`${side === 'before' ? 'Before' : 'After'} cleanup on ${reportDateLabel(report.completionDate)}`} /><span>{side === 'before' ? 'Before' : 'After'}</span></a> : null)}</div>
            {report.cleanupDescription && <p>{report.cleanupDescription}</p>}
            <p>{[report.bagsOrItemsRemoved != null ? `${report.bagsOrItemsRemoved} bags/items` : null, report.weightPounds != null ? `${report.weightPounds} lb` : null, report.cleanupMinutes != null ? `${report.cleanupMinutes} min` : null].filter(Boolean).join(' · ')}</p>
          </div></details> : <span>{event.label}</span>}
        </li>)}</ol>
        {report.id !== reportId && <Link className={styles.reportLink} href={`/reports/${report.id}`}>View report</Link>}
      </details>
    </li>)}</ol>
  </section>;
}

export function ReportSiteActivity({ reportId, initialReport, initialSite, mode = 'all' }: { reportId: string; initialReport?: PublicReportShareModel; initialSite?: ReportSite | null; mode?: 'all' | 'actions' | 'timeline' }) {
  const [site, setSite] = useState<ReportSite | null>(initialSite ?? null);
  const [loading, setLoading] = useState(initialSite === undefined);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [composing, setComposing] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState<ReportDraft | null>(null);
  const refreshRevision = useDataRefresh();
  const [progress, setProgress] = useState('');
  const [notice, setNotice] = useState('');
  const router = useRouter();
  useEffect(() => {
    if (initialSite !== undefined && revision === 0 && refreshRevision === 0) return;
    let active = true;
    void fetchSite(reportId).then(value => { if (active) { setSite(value); setFailed(false); setLoading(false); } }).catch(() => { if (active) { setFailed(true); setLoading(false); } });
    return () => { active = false; };
  }, [reportId, initialSite, revision, refreshRevision]);
  useEffect(() => {
    if (mode === 'timeline') return;
    const url = new URL(window.location.href);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore a notice carried across a full report navigation.
    if (url.searchParams.get('alreadyReported') === '1') setNotice('New litter has already been reported.');
    if (url.searchParams.get('reportAgain') === '1' && site?.canReportAgain) {
      setComposing(true); url.searchParams.delete('reportAgain'); window.history.replaceState(window.history.state, '', url);
    }
  }, [site, mode]);
  async function begin() {
    {
      const { data } = await createClient().auth.getUser();
      if (!data.user || data.user.is_anonymous) {
        const next = new URL(window.location.href); next.searchParams.set('reportAgain', '1');
        router.push(`/sign-in?next=${encodeURIComponent(next.pathname + next.search)}`);
        return;
      }
      const source = site?.reports.filter(report => report.state === 'completed').at(-1);
      if (source && !site?.local) {
        try { setRestoredDraft((await loadSiteReportPublication(source.id, data.user.id))?.draft ?? null); }
        catch { setNotice('Your saved report could not be opened. Try again.'); return; }
      }
    }
    setComposing(true);
  }
  const source = site?.reports.filter(report => report.state === 'completed').at(-1);
  if (loading) return mode !== 'actions' && initialReport ? <ReportTimeline report={initialReport} /> : null;
  if (failed) return <div className={styles.retry}><span>Timeline could not be loaded.</span><button className="secondary-button" onClick={() => { setLoading(true); setRevision(value => value + 1); }}>Try again</button></div>;
  if (!site) return mode !== 'actions' && initialReport ? <ReportTimeline report={initialReport} /> : null;
  if (mode === 'actions' && !notice && !composing && !(site.canReportAgain && source?.location) && !(site.currentReportId && site.currentReportId !== reportId)) return null;
  return <div className={mode === 'actions' ? styles.actions : styles.activity}>
    {mode !== 'timeline' && <>
    {notice && <div className={styles.notice} role="status"><span>{notice}</span><button aria-label="Dismiss notice" onClick={() => { setNotice(''); const url = new URL(window.location.href); url.searchParams.delete('alreadyReported'); window.history.replaceState(window.history.state, '', url); }}><FiX /></button></div>}
    {site.currentReportId && site.currentReportId !== reportId && <Link className="primary-button button-link" href={`/reports/${site.currentReportId}`}>View latest report</Link>}
    {site.canReportAgain && source?.location && <button className={styles.again} onClick={() => void begin()}><span className={styles.reportBug} aria-hidden />Needs cleaning again</button>}
    </>}
    {mode !== 'actions' && <SiteTimeline site={site} reportId={reportId} />}
    {composing && source?.location && <ReportWizard initialDraft={restoredDraft ?? { ...EMPTY_REPORT_DRAFT, title: source.title }} initialState={restoredDraft ? { draft: restoredDraft, step: 4, fundingChoice: 'none', customAmount: '' } : undefined} isEditing={false} coordinates={source.location} submissionProgress={progress} onClose={() => setComposing(false)} onSubmit={async draft => {
      try {
        const result = await submitSiteReport(source.id, draft, source.location!, Boolean(site.local), setProgress);
        setComposing(false);
        router.push(`${sitePath(site.id)}${result.alreadyReported ? '?alreadyReported=1' : ''}`);
        router.refresh();
        return null;
      } catch (error) { return error instanceof ReportLocationError ? error : error instanceof Error ? error.message : 'Report could not be saved. Try again.'; }
      finally { setProgress(''); }
    }} />}
  </div>;
}
