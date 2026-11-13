import Link from 'next/link';
import { FiArrowUpRight, FiBarChart2, FiCompass, FiExternalLink, FiFlag, FiSearch, FiSmartphone } from 'react-icons/fi';

import { SOURCE_LINKS, SOURCE_NAMES, ratio, windowLabel, type Dashboard, type Source, type SourceId, type SeriesPoint } from '@/lib/admin-analytics/model';
import styles from './dashboard.module.css';

const count = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('en-US');
const percent = (value: number | null) => value == null ? '—' : `${(value * 100).toFixed(1)}%`;
const statusName = { live: 'Connected', snapshot: 'Local snapshot', error: 'Unavailable', unconfigured: 'Not connected', awaiting_release: 'Awaiting production data' };

function SourceLabel({ id, source }: { id: SourceId; source: Source<unknown> }) {
  return <span className={styles.sourceLabel}>{SOURCE_NAMES[id]} <span aria-hidden="true">·</span> {windowLabel(source.window)}</span>;
}
function Missing({ source }: { source: Source<unknown> }) {
  return <p className={styles.empty}>{source.status === 'error' ? 'This source is temporarily unavailable.' : 'Connect this source to see its data here.'} <a href="#connections">Connection details <FiArrowUpRight /></a></p>;
}
function DailyChart({ points, label }: { points: SeriesPoint[]; label: string }) {
  if (!points.length) return <p className={styles.note}>Daily trend is unavailable in this snapshot.</p>;
  const max = Math.max(1, ...points.map(p => p.value));
  return <div className={styles.chart}>
    <div className={styles.bars} role="img" aria-label={`${label}. ${points.map(p => `${p.date}: ${p.value}`).join('; ')}`}>
      {points.map(point => <div className={styles.barColumn} key={point.date} title={`${point.date}: ${count(point.value)}`}><span style={{ height: `${point.value / max * 100}%` }} /></div>)}
    </div>
    <div className={styles.axis}><span>{points[0].date}</span><span>{count(max)} maximum / day</span><span>{points.at(-1)?.date}</span></div>
    <details className={styles.chartData}><summary>Daily values</summary><table><caption>{label}</caption><thead><tr><th>Date</th><th>Count</th></tr></thead><tbody>{points.map(point => <tr key={point.date}><th>{point.date}</th><td>{count(point.value)}</td></tr>)}</tbody></table></details>
  </div>;
}
function Breakdown({ rows, empty }: { rows: { label: string; value: number }[]; empty: string }) {
  if (!rows.length) return <p className={styles.empty}>{empty}</p>;
  return <ul className={styles.breakdown}>{rows.map((row, i) => <li key={`${row.label}-${i}`}><span>{row.label || 'Not specified'}</span><strong>{count(row.value)}</strong></li>)}</ul>;
}

export function AnalyticsDashboard({ dashboard, view = 'overview' }: { dashboard: Dashboard; view?: 'overview' | 'website' | 'app' }) {
  const { ga, gsc, posthog, clarity, app } = dashboard.sources;
  const mapReach = posthog.data ? ratio(posthog.data.mapVisits, posthog.data.visits) : null;
  const snapshots = Object.values(dashboard.sources).some(source => source.status === 'snapshot');
  const connected = [ga, gsc, posthog, clarity].filter(source => source.data !== null).length;
  return <div className={styles.canvas}><main className={styles.shell} data-clarity-mask="true">
    <header className={styles.header}>
      <Link className={styles.brand} href="/admin"><span className={styles.brandMark}><FiBarChart2 /></span>Litterbugs <span> / </span> Owner dashboard</Link>
      <nav aria-label="Admin"><Link href="/admin">Review inbox <FiArrowUpRight /></Link><Link href="/map">Open map <FiArrowUpRight /></Link></nav>
    </header>
    <div className={styles.intro}>
      <div><p className={styles.eyebrow}>WEBSITE & APP ANALYTICS</p><h1>A clearer picture of Litterbugs.</h1><p>How people find us, explore the map, and take part.</p></div>
      <div className={styles.period}><span>Complete days · ends yesterday</span><nav aria-label="Reporting period">{([7, 28] as const).map(days => <Link key={days} prefetch={false} aria-current={dashboard.period === days ? 'page' : undefined} href={`/admin/analytics?days=${days}&view=${view}`}>Last {days} days</Link>)}</nav></div>
    </div>
    <nav className={styles.viewTabs} aria-label="Analytics view">{(['overview', 'website', 'app'] as const).map(tab => <Link key={tab} prefetch={false} aria-current={view === tab ? 'page' : undefined} href={`/admin/analytics?days=${dashboard.period}&view=${tab}`}>{tab === 'overview' ? 'Overview' : tab === 'app' ? 'App' : 'Website'}</Link>)}</nav>
    <div className={styles.coverage}><span className={styles.coverageDot} />{connected} of 4 sources have data{snapshots ? ' · Local review uses dated snapshots' : ''}<a href="#connections">Sources & freshness <FiArrowUpRight /></a></div>
    {view !== 'app' && <>
    <section className={styles.metrics} aria-label="At a glance">
      <a className={styles.metric} href="#traffic"><span><FiBarChart2 /> Website sessions</span><strong>{count(ga.data?.sessions)}</strong><SourceLabel id="ga" source={ga} /><small>{ga.data ? ga.data.users == null ? "Google’s counting method" : `${count(ga.data.users)} users · Google’s counting method` : statusName[ga.status]}</small></a>
      <a className={`${styles.metric} ${styles.featured}`} href="#map"><span><FiCompass /> Visits reaching the map</span><strong>{percent(mapReach)}</strong><SourceLabel id="posthog" source={posthog} /><small>{posthog.data ? `${count(posthog.data.mapVisits)} of ${count(posthog.data.visits)} tracked visits` : statusName[posthog.status]}</small></a>
      <a className={styles.metric} href="#search"><span><FiSearch /> Google search clicks</span><strong>{count(gsc.data?.clicks)}</strong><SourceLabel id="gsc" source={gsc} /><small>{gsc.data ? `${count(gsc.data.impressions)} search impressions` : statusName[gsc.status]}</small></a>
      <a className={styles.metric} href="#friction"><span><FiFlag /> Sessions with dead clicks</span><strong>{count(clarity.data?.deadSessions)}</strong><SourceLabel id="clarity" source={clarity} /><small>{clarity.data ? `Out of ${count(clarity.data.sessions)} Clarity sessions` : statusName[clarity.status]}</small></a>
    </section>

    <div className={styles.mainGrid}>
      <section className={styles.section} id="traffic"><div className={styles.sectionHeading}><div><h2>Where people come from</h2><SourceLabel id="ga" source={ga} /></div><a href={SOURCE_LINKS.ga} target="_blank" rel="noreferrer" aria-label="Open Google Analytics"><FiExternalLink /></a></div>
        {ga.data ? <><DailyChart points={ga.data.daily} label="Daily Google Analytics sessions" /><h3>Top channels <span>Sessions</span></h3><Breakdown rows={ga.data.channels} empty="No channel breakdown returned." /></> : <Missing source={ga} />}
      </section>
      <section className={styles.mapSection} id="map"><div className={styles.sectionHeading}><div><h2>Are visitors exploring?</h2><SourceLabel id="posthog" source={posthog} /></div><FiCompass /></div>
        {posthog.data ? <><p className={styles.reachNumber}>{percent(mapReach)}</p><p>{count(posthog.data.mapVisits)} tracked visits reached the map out of {count(posthog.data.visits)} website visits.</p><div className={styles.track} role="img" aria-label={`Map reach: ${percent(mapReach)}`}><span style={{ width: `${Math.min(100, (mapReach ?? 0) * 100)}%` }} /></div><div className={styles.mapStat}><strong>{count(posthog.data.reportOpens)}</strong><span>visits opened report details on the map</span></div><p className={styles.note}>Includes direct map arrivals. Reaching the page does not mean the tiles finished loading.</p></> : <Missing source={posthog} />}
      </section>
    </div>

    <div className={styles.mainGrid}>
      <section className={styles.section} id="search"><div className={styles.sectionHeading}><div><h2>Getting found on Google</h2><SourceLabel id="gsc" source={gsc} /></div><a href={SOURCE_LINKS.gsc} target="_blank" rel="noreferrer" aria-label="Open Search Console"><FiExternalLink /></a></div>
        {gsc.data ? <><div className={styles.searchMetrics}><div><strong>{count(gsc.data.impressions)}</strong><span>Impressions</span></div><div><strong>{percent(gsc.data.ctr)}</strong><span>Click-through rate</span></div><div><strong>{gsc.data.position?.toFixed(1) ?? '—'}</strong><span>Average position</span></div></div><DailyChart points={gsc.data.daily} label="Daily Google search clicks" /><h3>Top search terms <span>Clicks</span></h3><Breakdown rows={gsc.data.queries} empty="No search terms returned. Google omits some low-volume searches." /><p className={styles.note}>Final data ends three days ago. Top terms exclude anonymized searches; their sum can differ from total clicks.</p></> : <Missing source={gsc} />}
      </section>
      <section className={styles.section} id="friction"><div className={styles.sectionHeading}><div><h2>Where visits get stuck</h2><SourceLabel id="clarity" source={clarity} /></div><a href={SOURCE_LINKS.clarity} target="_blank" rel="noreferrer" aria-label="Open Clarity"><FiExternalLink /></a></div>
        {clarity.data ? <><p className={styles.note}>Recent 3-day window · independent of the period above</p><div className={styles.friction}>{[['Rage clicks', clarity.data.rageSessions, 'Repeated clicks in one spot'], ['Dead clicks', clarity.data.deadSessions, 'Clicks without a visible response'], ['Quick backs', clarity.data.quickBackSessions, 'Visits that quickly return'], ['Script errors', clarity.data.scriptErrorSessions, 'Sessions with a recorded error']].map(([name, value, description]) => <div key={String(name)}><div><strong>{name}</strong><span>{description}</span></div><b>{count(value as number | null)}</b></div>)}</div><a className={styles.action} href={`${SOURCE_LINKS.clarity.replace('/dashboard', '/impressions')}`} target="_blank" rel="noreferrer">Review recordings <FiArrowUpRight /></a><p className={styles.note}>Signals are leads to investigate. One session may have several signals. Staff traffic may remain.</p></> : <Missing source={clarity} />}
      </section>
    </div>

    <section className={styles.activity}><div className={styles.sectionHeading}><div><h2>From interest to a cleanup</h2><SourceLabel id="posthog" source={posthog} /></div><a href={SOURCE_LINKS.posthog} target="_blank" rel="noreferrer">Explore activity <FiArrowUpRight /></a></div>
      {posthog.data ? <><div className={styles.activityMetrics}>{[['Started a cleanup', posthog.data.cleanupStarts], ['Claimed a cleanup', posthog.data.cleanupClaims], ['Submitted evidence', posthog.data.cleanupSubmissions]].map(([label, value]) => <div key={label}><strong>{count(value as number)}</strong><span>{label}</span><small>tracked sessions</small></div>)}</div><p className={styles.note}>Independent stage counts, not an ordered funnel. A claim is not an approved cleanup. Browser activity does not represent all platform activity.</p><div className={styles.failureNote}><FiFlag /><span><strong>{count(posthog.data.failures)} workflow failure events</strong>{posthog.data.mapStarts ? ` · ${count(posthog.data.mapFailures)} map failure events from ${count(posthog.data.mapStarts)} map starts` : ' · Map loading coverage is not established yet.'}</span></div></> : <Missing source={posthog} />}
    </section>

    </>}
    {view !== 'website' && <section className={styles.appSection} id="app"><div className={styles.sectionHeading}><div><h2><FiSmartphone /> Litterbugs in the app</h2><SourceLabel id="app" source={app} /></div><span className={styles.appStatus}>{statusName[app.status]}</span></div>
      {app.data ? <><div className={styles.activityMetrics}>{[['App launches', app.data.launches], ['Reports published', app.data.reports], ['Cleanups claimed', app.data.claims], ['Evidence submitted', app.data.submissions], ['Approvals observed', app.data.approvals], ['Workflow failures', app.data.failures]].map(([label, value]) => <div key={label}><strong>{count(value as number)}</strong><span>{label}</span><small>production events</small></div>)}</div><div className={styles.appTimings}><div><strong>{app.data.reportReadyMedian == null ? '—' : `${(app.data.reportReadyMedian / 1000).toFixed(1)}s`}</strong><span>Median report-details readiness</span><small>{count(app.data.reportReadySamples)} foreground samples · photo link and status ready</small></div><div><strong>{app.data.mapReadyMedian == null ? '—' : `${(app.data.mapReadyMedian / 1000).toFixed(1)}s`}</strong><span>Median map-first launch readiness</span><small>{count(app.data.mapReadySamples)} foreground samples · starts when app JavaScript begins</small></div></div><p className={styles.note}>These counts describe tracked app events, not unique people or all platform activity. Approvals observed in the app exclude approvals made elsewhere. Launch timing excludes welcome/sign-in launches and does not include all native startup time.</p></> : app.status === 'error' ? <Missing source={app} /> : <div className={styles.appPending}><FiSmartphone /><div><h3>Ready for the app’s next chapter.</h3><p>Production activity will appear here after the updated app is released and analytics is connected.</p><div className={styles.planned}><span>Map & report speed</span><span>Reporting & cleanups</span><span>Sign-in & shared links</span><span>Failures & recovery</span></div><p className={styles.note}>Test builds and emulators stay out of these numbers. No production data has been confirmed for the new app yet.</p></div></div>}
      <div className={styles.nativeCoverage}><FiFlag /><div><strong>Crash coverage is tracked separately</strong><p>Native crash reports can lack the app’s environment tags. Production crash totals need verified release attribution before they can be shown here.</p><a href="https://us.posthog.com/project/695338/error_tracking" target="_blank" rel="noreferrer">Review diagnostics in PostHog <FiArrowUpRight /></a></div></div>
    </section>}

    <section className={styles.connections} id="connections"><h2>Sources & freshness</h2><p>Each tool measures a different part of the journey. Visitor totals are kept separate.</p><div className={styles.sourceGrid}>{(Object.keys(dashboard.sources) as SourceId[]).map(id => {
      const source = dashboard.sources[id];
      return <div key={id}><div className={styles.sourceHeading}><h3>{SOURCE_NAMES[id]}</h3><span data-state={source.status}>{statusName[source.status]}</span></div><p>{windowLabel(source.window)} · {source.window.timezone}</p><p>{source.updatedAt ? `Fetched ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).format(new Date(source.updatedAt))} ET` : 'No report fetched'}</p><p>{source.note}</p><a href={SOURCE_LINKS[id]} target="_blank" rel="noreferrer">Open {SOURCE_NAMES[id]} <FiArrowUpRight /></a></div>;
    })}</div><details className={styles.definitions}><summary>How to read these numbers</summary><p>GA sessions, PostHog sessions, and Clarity recordings have different collection rules and coverage. They cannot be summed or matched to individual people. Map reach uses PostHog for both its numerator and denominator. Missing values appear as a dash; an observed zero appears as 0. Search clicks are clicks from Google search results, not website visitors or app installs. Known test traffic is excluded where configured; historical unmarked testing can remain. New map and participation tracking has limited historical coverage.</p></details></section>
  </main></div>;
}
