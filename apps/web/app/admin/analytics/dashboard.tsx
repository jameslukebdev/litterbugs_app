import Link from 'next/link';
import { FiArrowUpRight, FiBarChart2, FiCompass, FiDollarSign, FiFlag, FiMapPin, FiSmartphone, FiUsers } from 'react-icons/fi';
import type { ReactNode } from 'react';

import { SOURCE_LINKS, ratio, totalVisits, windowLabel, type BusinessData, type Dashboard, type Row, type SeriesPoint } from '@/lib/admin-analytics/model';
import styles from './dashboard.module.css';

const count = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('en-US', { maximumFractionDigits: 1 });
const money = (cents: number | null | undefined) => cents == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
const percent = (value: number | null) => value == null ? '—' : `${(value * 100).toFixed(1)}%`;
const shortDate = (value: string | undefined) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)) : '';

function Metric({ label, value, icon, children, featured = false }: { label: string; value: string; icon?: ReactNode; children?: ReactNode; featured?: boolean }) {
  return <article className={`${styles.metric} ${featured ? styles.featured : ''}`}>
    <div className={styles.metricLabel}>{icon}{label}</div><strong className={styles.value}>{value}</strong>{children}
  </article>;
}
function Change({ current, previous, period, dollars = false }: { current?: number; previous?: number; period: number; dollars?: boolean }) {
  if (current == null || previous == null) return null;
  const change = current - previous;
  return <span className={styles.change}>{change > 0 ? '+' : change < 0 ? '−' : ''}{dollars ? money(Math.abs(change)) : count(Math.abs(change))} <span>vs {period === 7 ? 'last week' : 'previous 28 days'}</span></span>;
}
function ActivityChart({ data }: { data: BusinessData | null }) {
  if (!data) return <p className={styles.empty}>Activity will appear here when available.</p>;
  const max = Math.max(1, ...data.daily.flatMap(day => [day.reports, day.cleanups]));
  return <>
    <div className={styles.legend}><span><i />Reports</span><span><i />Cleanups</span></div>
    <div className={styles.chartFrame}><span className={styles.chartTop} aria-hidden="true">{max}</span><span className={styles.chartZero} aria-hidden="true">0</span><div className={styles.chart} role="img" aria-label={data.daily.map(day => `${day.date}: ${day.reports} reports, ${day.cleanups} cleanups`).join('; ')}>
      {data.daily.map(day => <div className={styles.chartDay} key={day.date} title={`${day.date}: ${day.reports} reports, ${day.cleanups} cleanups`}><span style={{ height: `${day.reports / max * 100}%` }} /><span style={{ height: `${day.cleanups / max * 100}%` }} /></div>)}
    </div></div>
    <div className={styles.axis}><span>{shortDate(data.daily[0]?.date)}</span><span>{shortDate(data.daily.at(-1)?.date)}</span></div>
  </>;
}
function SearchChart({ points }: { points: SeriesPoint[] }) {
  if (!points.length) return null;
  const max = Math.max(1, ...points.map(point => point.value));
  return <><div className={styles.chartFrame}><span className={styles.chartTop} aria-hidden="true">{max}</span><span className={styles.chartZero} aria-hidden="true">0</span><div className={styles.chart} role="img" aria-label={points.map(p => `${p.date}: ${p.value} search clicks`).join('; ')}>{points.map(point => <div className={styles.chartDay} key={point.date} title={`${point.date}: ${point.value} clicks`}><span style={{ height: `${point.value / max * 100}%` }} /></div>)}</div></div><div className={styles.axis}><span>{shortDate(points[0].date)}</span><span>{shortDate(points.at(-1)?.date)}</span></div></>;
}
function Breakdown({ rows }: { rows: Row[] }) {
  return rows.length ? <ul className={styles.rows}>{rows.map((row, i) => <li key={`${row.label}-${i}`}><span>{row.label || 'Other'}</span><strong>{count(row.value)}</strong></li>)}</ul> : <p className={styles.empty}>No activity to show yet.</p>;
}

export function AnalyticsDashboard({ dashboard, view = 'overview' }: { dashboard: Dashboard; view?: 'overview' | 'website' | 'app' }) {
  const { ga, gsc, posthog, clarity, app } = dashboard.sources;
  const business = dashboard.business.data;
  const webVisits = posthog.data?.visits;
  const appVisits = app.data?.visits;
  const dateWindow = dashboard.business.data ? dashboard.business.window : posthog.window;
  const mapReach = posthog.data ? ratio(posthog.data.mapVisits, posthog.data.visits) : null;
  return <div className={styles.canvas}><main className={styles.shell} data-clarity-mask="true">
    <header className={styles.header}>
      <Link className={styles.brand} href="/admin"><span><FiBarChart2 /></span>Litterbugs</Link>
      <nav aria-label="Admin"><Link href="/admin">Review inbox <FiArrowUpRight /></Link><Link href="/map">Open map <FiArrowUpRight /></Link></nav>
    </header>
    <div className={styles.intro}><h1>Analytics</h1><div className={styles.period}><span>{windowLabel(dateWindow)}</span><nav aria-label="Reporting period">{([7, 28] as const).map(days => <Link key={days} prefetch={false} aria-current={dashboard.period === days ? 'page' : undefined} href={`/admin/analytics?days=${days}&view=${view}`}>Last {days} days</Link>)}</nav></div></div>
    <nav className={styles.tabs} aria-label="Analytics view">{(['overview', 'website', 'app'] as const).map(tab => <Link key={tab} prefetch={false} aria-current={view === tab ? 'page' : undefined} href={`/admin/analytics?days=${dashboard.period}&view=${tab}`}>{tab === 'overview' ? 'Overview' : tab === 'app' ? 'App' : 'Website'}</Link>)}</nav>

    {view === 'overview' && <>
      <section className={styles.metrics} aria-label="At a glance">
        <Metric label="Total visits" value={count(totalVisits(webVisits, appVisits))} icon={<FiBarChart2 />}>
          <div className={styles.visitSplit}><span>Website <b>{count(webVisits)}</b></span><span>App <b>{count(appVisits)}</b></span></div>
          {appVisits == null && <small>{app.status === 'awaiting_release' ? 'App visits will appear with the update.' : 'App visits aren’t available yet.'}</small>}
        </Metric>
        <Metric label="Completed cleanups" value={count(business?.completedCleanups)} icon={<FiCompass />} featured><Change current={business?.completedCleanups} previous={business?.previous.completedCleanups} period={dashboard.period} /></Metric>
        <Metric label="Cleanup funding" value={money(business?.fundedCents)} icon={<FiDollarSign />}><Change current={business?.fundedCents} previous={business?.previous.fundedCents} period={dashboard.period} dollars />{!!business?.refundedCents && <small>{money(business.refundedCents)} returned</small>}</Metric>
        <Metric label="New litter reports" value={count(business?.newReports)} icon={<FiMapPin />}><Change current={business?.newReports} previous={business?.previous.newReports} period={dashboard.period} /></Metric>
        <Metric label="Active contributors" value={count(business?.contributors)} icon={<FiUsers />}><Change current={business?.contributors} previous={business?.previous.contributors} period={dashboard.period} /></Metric>
        <Metric label="Awaiting cleanup now" value={count(business?.awaitingCleanup)} icon={<FiFlag />}><small>{business ? `${count(business.fundedWaiting)} funded · ${count(business.awaitingCleanup - business.fundedWaiting)} volunteer` : 'Available reports will appear here.'}</small></Metric>
      </section>
      <div className={styles.twoColumns}>
        <section className={styles.section}><h2>Reports & cleanups</h2><ActivityChart data={business} /></section>
        <section className={styles.waiting}><h2>Needs attention <span>Now</span></h2><ul className={styles.rows}><li><span>Funded, waiting for a cleaner</span><strong>{count(business?.fundedWaiting)}</strong></li><li><span>Waiting for review</span><strong>{count(business?.awaitingReview)}</strong></li><li><span>Oldest available report</span><strong>{business?.oldestWaitingDays == null ? '—' : `${count(business.oldestWaitingDays)} days`}</strong></li></ul></section>
      </div>
      <section className={styles.impact}><h2>Reported impact</h2><div className={styles.impactStats}><div><strong>{count(business?.pounds)}<em> lb</em></strong><span>Litter removed</span>{business && <small>From {count(business.weightCount)} cleanups</small>}</div><div><strong>{count(business?.bags)}</strong><span>Bags / items removed</span>{business && <small>From {count(business.bagsCount)} cleanups</small>}</div><div><strong>{count(business?.hours)}<em> hrs</em></strong><span>Time spent cleaning</span>{business && <small>{business.durationCount ? `From ${count(business.durationCount)} cleanups` : "Not recorded yet"}</small>}</div></div></section>
    </>}

    {view === 'website' && <>
      <section className={styles.metrics} aria-label="Website activity"><Metric label="Visits" value={count(webVisits)} /><Metric label="Reached the map" value={percent(mapReach)} /><Metric label="Opened a report" value={count(posthog.data?.reportOpens)} /></section>
      <div className={styles.twoColumns}><section className={styles.section}><h2>Where visitors came from</h2><Breakdown rows={(ga.data?.channels ?? []).map(row => ({ ...row, label: ({ Direct: 'Direct visits', 'Organic Social': 'Social media', 'Organic Search': 'Search engines', Referral: 'Other websites', Unassigned: 'Unknown' } as Record<string, string>)[row.label] ?? row.label }))} /></section><section className={styles.section}><h2>Google search <span>{windowLabel(gsc.window)}</span></h2><div className={styles.inlineStats}><div><strong>{count(gsc.data?.clicks)}</strong><span>Clicks</span></div><div><strong>{count(gsc.data?.impressions)}</strong><span>Appearances</span></div></div><SearchChart points={gsc.data?.daily ?? []} /></section></div>
      <div className={styles.twoColumns}><section className={styles.section}><h2>Search terms</h2><Breakdown rows={gsc.data?.queries ?? []} /></section><section className={styles.section}><h2>Worth a look <span>{windowLabel(clarity.window)}</span></h2><ul className={styles.rows}><li><span>Repeated clicks</span><strong>{count(clarity.data?.rageSessions)}</strong></li><li><span>Clicks without a response</span><strong>{count(clarity.data?.deadSessions)}</strong></li><li><span>Quick returns</span><strong>{count(clarity.data?.quickBackSessions)}</strong></li></ul><a className={styles.action} href={SOURCE_LINKS.clarity.replace('/dashboard', '/impressions')} target="_blank" rel="noreferrer">Watch visits <FiArrowUpRight /></a></section></div>
    </>}

    {view === 'app' && <>
      {app.data ? <><section className={styles.metrics} aria-label="App activity"><Metric label="Visits" value={count(appVisits)} /><Metric label="Reports submitted" value={count(app.data.reports)} /><Metric label="Cleanups claimed" value={count(app.data.claims)} /></section><div className={styles.twoColumns}><section className={styles.section}><h2>Typical wait</h2><ul className={styles.rows}><li><span>Report ready</span><strong>{app.data.reportReadyMedian == null ? '—' : `${(app.data.reportReadyMedian / 1000).toFixed(1)}s`}</strong></li><li><span>Map ready</span><strong>{app.data.mapReadyMedian == null ? '—' : `${(app.data.mapReadyMedian / 1000).toFixed(1)}s`}</strong></li></ul></section><section className={styles.section}><h2>Participation</h2><ul className={styles.rows}><li><span>Signed in</span><strong>{count(app.data.signIns)}</strong></li><li><span>Cleanup photos sent</span><strong>{count(app.data.submissions)}</strong></li><li><span>Actions that failed</span><strong>{count(app.data.failures)}</strong></li></ul></section></div></> : <section className={styles.appPending}><FiSmartphone /><h2>App activity</h2><p>Visits and activity will appear here after the app update is live.</p></section>}
    </>}
  </main></div>;
}
