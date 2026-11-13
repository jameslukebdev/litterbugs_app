// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AnalyticsDashboard } from './dashboard';
import type { AppData, BusinessData, Dashboard, Source, SourceData } from '@/lib/admin-analytics/model';
const source = <T,>(data: T | null): Source<T> => ({ data, status: data ? 'snapshot' : 'unconfigured', updatedAt: null, window: { start: '2026-11-06', end: '2026-11-12', timezone: 'UTC' }, note: '' });
const business: BusinessData = { newReports: 6, completedCleanups: 4, fundedCents: 4700, refundedCents: 0, contributors: 5, paidCleanups: 2, awaitingCleanup: 14, fundedWaiting: 4, oldestWaitingDays: 25, awaitingReview: 0, pounds: 130, weightCount: 4, bags: 7, bagsCount: 4, hours: null, durationCount: 0, daily: [{ date: '2026-11-06', reports: 6, cleanups: 4 }], previous: { newReports: 4, completedCleanups: 2, fundedCents: 2000, contributors: 4 } };
const dashboard: Dashboard = { period: 7, business: source(business), sources: {
  ga: source<SourceData['ga']>(null), gsc: source<SourceData['gsc']>(null), clarity: source({ sessions: 21, rageSessions: 0, deadSessions: 1, quickBackSessions: 4, scriptErrorSessions: null }),
  posthog: source({ visits: 108, mapVisits: 36, reportOpens: 11, cleanupStarts: 4, cleanupClaims: 1, cleanupSubmissions: 0, failures: 1, mapStarts: 0, mapReady: 0, mapFailures: 0 }), app: { ...source<AppData>(null), status: 'awaiting_release' },
} };
afterEach(cleanup);
const tile = (name: string) => screen.getByText(name).closest('article')!;
describe('simple owner analytics', () => {
  it('shows six business metrics without provider and diagnostic language', () => {
    render(<AnalyticsDashboard dashboard={dashboard} />);
    expect(within(screen.getByRole('region', { name: 'At a glance' })).getAllByRole('article')).toHaveLength(6);
    expect(within(tile('New litter reports')).getByText('6')).toBeTruthy();
    expect(within(tile('Completed cleanups')).getByText('4')).toBeTruthy();
    expect(within(tile('Cleanup funding')).getByText('$47')).toBeTruthy();
    expect(within(tile('Active contributors')).getByText('5')).toBeTruthy();
    expect(within(tile('Awaiting cleanup now')).getByText('14')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/PostHog|Clarity|freshness|snapshot|source|telemetry|production|canonical|foreground|attribution/i);
  });
  it('shows an honest web/app breakdown while app visits are unavailable', () => {
    render(<AnalyticsDashboard dashboard={dashboard} />);
    const visits = within(tile('Total visits'));
    expect(visits.getByText('108')).toBeTruthy();
    expect(visits.getAllByText('—')).toHaveLength(2);
    expect(visits.getByText('App visits will appear with the update.')).toBeTruthy();
  });
  it('adds app sessions to website sessions rather than app launches', () => {
    const data: AppData = { visits: 25, screens: 90, launches: 35, reports: 3, claims: 1, submissions: 0, approvals: 0, failures: 0, signIns: 1, reportReadyMedian: null, reportReadySamples: 0, mapReadyMedian: null, mapReadySamples: 0 };
    render(<AnalyticsDashboard dashboard={{ ...dashboard, sources: { ...dashboard.sources, app: source(data) } }} />);
    expect(within(tile('Total visits')).getByText('133')).toBeTruthy();
    expect(within(tile('Total visits')).getByText('25')).toBeTruthy();
    expect(screen.queryByText('143')).toBeNull();
  });
  it('keeps the app view while changing period and avoids an empty technical checklist', () => {
    render(<AnalyticsDashboard dashboard={dashboard} view="app" />);
    expect(screen.getByRole('link', { name: 'Last 28 days' }).getAttribute('href')).toContain('view=app');
    expect(screen.queryByRole('region', { name: 'At a glance' })).toBeNull();
    expect(screen.getByText('Visits and activity will appear here after the app update is live.')).toBeTruthy();
    const tabs = screen.getByRole('navigation', { name: 'Analytics view' });
    expect(within(tabs).getByRole('link', { name: 'App' }).getAttribute('aria-current')).toBe('page');
  });
  it('does not turn missing business totals into zeros', () => {
    render(<AnalyticsDashboard dashboard={{ ...dashboard, business: source<BusinessData>(null) }} />);
    expect(within(tile('Cleanup funding')).getByText('—')).toBeTruthy();
    expect(within(tile('Completed cleanups')).getByText('—')).toBeTruthy();
    expect(screen.queryByText('$0')).toBeNull();
  });
});
