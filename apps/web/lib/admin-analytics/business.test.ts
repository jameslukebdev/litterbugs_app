import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ access: vi.fn(), read: vi.fn(), exec: vi.fn(), rpc: vi.fn(), create: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.create }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin-access', () => ({ getAdminAccessState: mocks.access }));
vi.mock('node:fs/promises', () => ({ readFile: mocks.read }));
vi.mock('node:util', () => ({ promisify: () => mocks.exec }));

const data = () => ({ newReports: 6, completedCleanups: 4, fundedCents: 4700, refundedCents: 0, contributors: 5, paidCleanups: 2, awaitingCleanup: 14, fundedWaiting: 4, oldestWaitingDays: 25, awaitingReview: 0, pounds: 130, weightCount: 4, bags: 7, bagsCount: 4, hours: null, durationCount: 0,
  daily: Array.from({ length: 7 }, (_, i) => ({ date: `2026-11-${String(i + 6).padStart(2, '0')}`, reports: i ? 0 : 6, cleanups: i ? 0 : 4 })), previous: { newReports: 4, completedCleanups: 2, fundedCents: 2000, contributors: 4 } });
const response = () => JSON.stringify({ rows: [{ period: 7, starts: '2026-11-06', ends: '2026-11-12', previous_starts: '2026-10-30', previous_ends: '2026-11-05', data: data() }] });
beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks(); vi.unstubAllEnvs(); vi.useRealTimers();
  vi.stubEnv('NODE_ENV', 'development');
  mocks.access.mockResolvedValue('authorized'); mocks.read.mockResolvedValue('mvaygkflcjswtwchflrk\n');
  mocks.exec.mockResolvedValue({ stdout: response() });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe('local business totals', () => {
  it.each(['signed_out', 'not_authorized', 'mfa_required'])('never starts a database command for %s visitors', async state => {
    mocks.access.mockResolvedValue(state);
    const { loadBusiness } = await import('./business');
    await expect(loadBusiness(7)).rejects.toThrow('Admin access required');
    expect(mocks.exec).not.toHaveBeenCalled(); expect(mocks.read).not.toHaveBeenCalled();
  });
  it('uses only the admin session RPC for hosted totals', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('ADMIN_ANALYTICS_HOSTED_CONNECTIONS', 'true');
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-13T15:00:00Z'));
    mocks.create.mockResolvedValue({ rpc: mocks.rpc }); mocks.rpc.mockResolvedValue({ data: JSON.parse(response()).rows, error: null });
    const { loadBusiness } = await import('./business');
    expect((await loadBusiness(7)).data?.newReports).toBe(6);
    expect(mocks.rpc).toHaveBeenCalledWith('owner_analytics_business'); expect(mocks.exec).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'private detail' } });
    expect((await loadBusiness(7)).status).toBe('error');
  });
  it('never runs the local CLI in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { loadBusiness } = await import('./business');
    expect((await loadBusiness(7)).data).toBeNull();
    expect(mocks.exec).not.toHaveBeenCalled(); expect(mocks.read).not.toHaveBeenCalled();
  });
  it('refuses a different linked database', async () => {
    mocks.read.mockResolvedValue('some-other-project');
    const { loadBusiness } = await import('./business');
    expect((await loadBusiness(7)).status).toBe('error');
    expect(mocks.exec).not.toHaveBeenCalled();
  });
  it('uses a fixed bounded read and caches both periods without copying credentials', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-13T15:00:00Z'));
    const { loadBusiness } = await import('./business');
    const first = await loadBusiness(7); const second = await loadBusiness(7);
    expect(first.data?.fundedCents).toBe(4700); expect(second.data?.contributors).toBe(5);
    expect(mocks.exec).toHaveBeenCalledTimes(1);
    const [command, args, options] = mocks.exec.mock.calls[0];
    expect(command).toBe('supabase');
    expect(args).toEqual(['db', 'query', '--linked', '--file', expect.stringContaining('/scripts/owner-analytics-business.sql'), '--output', 'json']);
    expect(options).toMatchObject({ timeout: 20_000, maxBuffer: 256_000 });
    expect(options).not.toHaveProperty('env');
    vi.useRealTimers();
  });
  it('rejects comparison dates that do not match local calendar days across DST', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-13T15:00:00Z'));
    const json = JSON.parse(response()); json.rows[0].previous_starts = '2026-10-29';
    mocks.exec.mockResolvedValue({ stdout: JSON.stringify(json) });
    const { loadBusiness } = await import('./business');
    expect((await loadBusiness(7)).status).toBe('error');
  });
  it('hides raw provider errors', async () => {
    mocks.exec.mockRejectedValue(new Error('secret token and private user row'));
    const { loadBusiness } = await import('./business');
    const result = await loadBusiness(7);
    expect(result.data).toBeNull(); expect(result.status).toBe('error');
    expect(JSON.stringify(result)).not.toMatch(/secret|private user/);
  });
  it('checks graph reconciliation, safe money and aggregate-only fields', async () => {
    const { normalizeBusiness } = await import('./business');
    expect(normalizeBusiness({ ...data(), customerEmail: 'private@example.invalid' })).not.toHaveProperty('customerEmail');
    expect(normalizeBusiness(data()).hours).toBeNull();
    expect(() => normalizeBusiness({ ...data(), newReports: 99 })).toThrow();
    expect(() => normalizeBusiness({ ...data(), fundedCents: Number.MAX_SAFE_INTEGER + 1 })).toThrow();
    expect(() => normalizeBusiness({ ...data(), fundedWaiting: 15 })).toThrow();
  });
});
