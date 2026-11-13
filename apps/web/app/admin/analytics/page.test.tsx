// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ access: vi.fn(), load: vi.fn(), refresh: vi.fn() }));
vi.mock('@/lib/admin-access', () => ({ getAdminAccessState: mocks.access }));
vi.mock('@/lib/admin-analytics/load', () => ({ loadDashboard: mocks.load }));
vi.mock('../admin-access', () => ({ AdminAccess: ({ state }: { state: string }) => <p>Access: {state}</p> }));
vi.mock('./dashboard', () => ({ AnalyticsDashboard: () => <p>Private analytics</p> }));
vi.mock('./auto-refresh', () => ({ AnalyticsAutoRefresh: () => { mocks.refresh(); return null; } }));
import Page from './page';
afterEach(() => { cleanup(); vi.resetAllMocks(); });
describe('analytics route gate', () => {
  it.each(['signed_out','not_authorized','mfa_required'])('only renders access controls for %s', async state => {
    mocks.access.mockResolvedValue(state);
    render(await Page({ searchParams: Promise.resolve({ days: '7' }) }));
    expect(screen.getByText(`Access: ${state}`)).toBeTruthy();
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.queryByText('Private analytics')).toBeNull();
  });
  it('passes the bounded selected period after authorization', async () => {
    mocks.access.mockResolvedValue('authorized'); mocks.load.mockResolvedValue({});
    render(await Page({ searchParams: Promise.resolve({ days: '28' }) }));
    expect(mocks.load).toHaveBeenCalledWith(28);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});
