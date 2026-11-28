import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ access: vi.fn(), source: vi.fn(), read: vi.fn(), end: '2026-11-12' }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin-access', () => ({ getAdminAccessState: mocks.access }));
vi.mock('node:fs/promises', () => ({ readFile: mocks.read }));
vi.mock('./providers', () => ({ liveSource: mocks.source, fetchGoogle: vi.fn(), fetchProduct: vi.fn(), fetchSearch: vi.fn(), fetchFriction: vi.fn(), fetchApp: vi.fn(), sourceWindows: () => Object.fromEntries(['ga','gsc','posthog','clarity','app'].map(id => [id, { start: '2026-11-06', end: mocks.end, timezone: 'UTC' }])) }));
import { loadDashboard } from './load';

beforeEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); mocks.end = '2026-11-12'; });
describe('private dashboard loading', () => {
  it.each(['signed_out','not_authorized','mfa_required'])('does not read files or providers for %s users', async state => {
    mocks.access.mockResolvedValue(state);
    await expect(loadDashboard(7)).rejects.toThrow('Admin access required');
    expect(mocks.source).not.toHaveBeenCalled();
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it('never reads local snapshots in production, even for authorized admins', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    mocks.access.mockResolvedValue('authorized');
    mocks.source.mockImplementation(async (_id, window) => ({ status: 'unconfigured', data: null, updatedAt: null, window, note: '' }));
    const dashboard = await loadDashboard(28);
    expect(dashboard.period).toBe(28);
    expect(mocks.source).toHaveBeenCalledTimes(5);
    expect(mocks.read).not.toHaveBeenCalled();
    expect(dashboard.sources.app.status).toBe('awaiting_release');
  });
  it('does not restore prerelease app totals from an older local snapshot', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    mocks.end = '2026-11-14';
    mocks.access.mockResolvedValue('authorized');
    mocks.source.mockImplementation(async (_id, window) => ({ status: 'unconfigured', data: null, updatedAt: null, window, note: '' }));
    mocks.read.mockResolvedValue(JSON.stringify({ '7': { app: { window: { start: '2026-11-08', end: '2026-11-14', timezone: 'America/New_York' }, updatedAt: '2026-11-15T13:00:00Z', data: { visits: 32, screens: 90, launches: 35, reports: 0, claims: 0, submissions: 0, approvals: 0, failures: 1, signIns: 16, reportReadyMedian: 800, reportReadySamples: 4, mapReadyMedian: 5500, mapReadySamples: 14 } } } }));
    const dashboard = await loadDashboard(7);
    expect(dashboard.sources.app.status).toBe('unconfigured');
    expect(dashboard.sources.app.data).toBeNull();
  });
  it.each([false, true])('uses the verified release ledger for a quiet app period (%s)', async released => {
    vi.stubEnv('NODE_ENV', 'production');
    mocks.end = released ? '2026-11-14' : '2026-11-12';
    mocks.access.mockResolvedValue('authorized');
    mocks.source.mockImplementation(async (id, window) => ({ status: 'live', data: id === 'app' ? { visits: 0, screens: 0, launches: 0, reports: 0, claims: 0, submissions: 0, approvals: 0, failures: 0, signIns: 0, reportReadyMedian: null, reportReadySamples: 0, mapReadyMedian: null, mapReadySamples: 0 } : null, updatedAt: null, window, note: '' }));
    const dashboard = await loadDashboard(7);
    expect(dashboard.sources.app.status).toBe(released ? 'live' : 'awaiting_release');
    expect(dashboard.sources.app.data?.visits ?? null).toBe(released ? 0 : null);
    expect(mocks.read).not.toHaveBeenCalled();
  });
});
