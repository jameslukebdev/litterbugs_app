// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AnalyticsDashboard } from './dashboard';
import type { Dashboard, Source, SourceData } from '@/lib/admin-analytics/model';
const source = <T,>(data: T | null): Source<T> => ({ data, status: data ? 'snapshot' : 'unconfigured', updatedAt: null, window: { start: '2026-11-06', end: '2026-11-12', timezone: 'UTC' }, note: '' });
const dashboard: Dashboard = { period: 7, sources: {
  ga: source<SourceData['ga']>(null), gsc: source<SourceData['gsc']>(null), clarity: source({ sessions: 21, rageSessions: 0, deadSessions: 1, quickBackSessions: 4, scriptErrorSessions: null }),
  posthog: source({ visits: 108, mapVisits: 36, reportOpens: 11, cleanupStarts: 4, cleanupClaims: 1, cleanupSubmissions: 0, failures: 1, mapStarts: 0, mapReady: 0, mapFailures: 0 }), app: { ...source(null), status: 'awaiting_release' },
} };
afterEach(cleanup);
describe('combined analytics views', () => {
  it('shows honest app readiness and source-specific website rates', () => {
    render(<AnalyticsDashboard dashboard={dashboard} />);
    expect(screen.getAllByText('33.3%')).toHaveLength(2);
    expect(screen.getByText('36 of 108 tracked visits')).toBeTruthy();
    expect(screen.getAllByText('Awaiting production data').length).toBeGreaterThan(0);
    expect(screen.getByText('Map loading coverage is not established yet.', { exact: false })).toBeTruthy();
    expect(screen.queryByText('0ms')).toBeNull();
  });
  it('keeps the selected app view when changing the reporting period', () => {
    render(<AnalyticsDashboard dashboard={dashboard} view="app" />);
    expect(screen.getByRole('link', { name: 'Last 28 days' }).getAttribute('href')).toContain('view=app');
    expect(screen.queryByRole('region', { name: 'At a glance' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Litterbugs in the app' })).toBeTruthy();
    const tabs = screen.getByRole('navigation', { name: 'Analytics view' });
    expect(within(tabs).getByRole('link', { name: 'App' }).getAttribute('aria-current')).toBe('page');
  });
});
