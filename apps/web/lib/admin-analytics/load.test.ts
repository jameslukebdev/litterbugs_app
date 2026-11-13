import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ access: vi.fn(), source: vi.fn(), read: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin-access', () => ({ getAdminAccessState: mocks.access }));
vi.mock('node:fs/promises', () => ({ readFile: mocks.read }));
vi.mock('./providers', () => ({ liveSource: mocks.source, fetchGoogle: vi.fn(), fetchProduct: vi.fn(), fetchSearch: vi.fn(), fetchFriction: vi.fn(), fetchApp: vi.fn(), sourceWindows: () => Object.fromEntries(['ga','gsc','posthog','clarity','app'].map(id => [id, { start: '2026-11-06', end: '2026-11-12', timezone: 'UTC' }])) }));
import { loadDashboard } from './load';

beforeEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });
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
});
