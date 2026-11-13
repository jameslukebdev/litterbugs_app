import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ access: vi.fn(), rpc: vi.fn(), create: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin-access', () => ({ getAdminAccessState: mocks.access }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.create }));
import { hostedClaritySource } from './hosted-clarity-cache';
const window = { start: '2026-11-10T00:00:00Z', end: '2026-11-13T00:00:00Z', timezone: 'UTC · rolling 72 hours' };
const metrics = { sessions: 29, rageSessions: null, deadSessions: null, quickBackSessions: null, scriptErrorSessions: null, rageRate: 0, deadRate: 0.069, quickBackRate: null, scriptErrorRate: 0 };
beforeEach(() => { vi.resetAllMocks(); mocks.access.mockResolvedValue('authorized'); mocks.create.mockResolvedValue({ rpc: mocks.rpc }); });
afterEach(() => vi.unstubAllEnvs());
describe('hosted Clarity quota', () => {
 it.each(['signed_out','not_authorized','mfa_required'])('does not touch quota or credentials for %s', async state => {
  mocks.access.mockResolvedValue(state); const loader = vi.fn();
  await expect(hostedClaritySource(window, loader, '')).rejects.toThrow('Admin access required');
  expect(mocks.create).not.toHaveBeenCalled(); expect(loader).not.toHaveBeenCalled();
 });
 it('uses shared observations across server instances without another export request', async () => {
  mocks.rpc.mockResolvedValue({ data: { claimed: false, source: { status: 'live', data: metrics, updatedAt: window.end, window } }, error: null });
  const loader = vi.fn();
  expect((await hostedClaritySource(window, loader, '')).data?.deadRate).toBe(0.069);
  expect(loader).not.toHaveBeenCalled(); expect(mocks.rpc).toHaveBeenCalledTimes(1);
 });
 it('reserves quota first and saves only normalized aggregates', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: { claimed: true, lease: 'lease' }, error: null }).mockResolvedValue({ error: null });
  const loader = vi.fn().mockImplementation(async () => { expect(mocks.rpc).toHaveBeenCalledTimes(1); return { ...metrics, privateEmail: 'private@example.invalid' }; });
  expect((await hostedClaritySource(window, loader, '')).status).toBe('live');
  expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain('privateEmail');
  expect(mocks.rpc.mock.calls[1][1]).toMatchObject({ target_lease: 'lease', observed_source: { status: 'live', data: metrics } });
 });
 it('records a failed observation without retrying or exposing raw errors', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: { claimed: true, lease: 'lease' }, error: null }).mockResolvedValue({ error: null });
  const loader = vi.fn().mockRejectedValue(new Error('private-token'));
  const result = await hostedClaritySource(window, loader, '');
  expect(result.status).toBe('error'); expect(loader).toHaveBeenCalledTimes(1);
  expect(mocks.rpc.mock.calls[1][1].observed_source.data).toBeNull();
  expect(JSON.stringify(result)).not.toContain('private-token');
 });
 it('never spends quota when the shared reservation fails', async () => {
  mocks.rpc.mockResolvedValue({ error: { message: 'database detail' } }); const loader = vi.fn();
  expect((await hostedClaritySource(window, loader, '')).status).toBe('error'); expect(loader).not.toHaveBeenCalled();
 });
});
