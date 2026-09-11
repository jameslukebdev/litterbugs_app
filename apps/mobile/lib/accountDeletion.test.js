import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  invoke: vi.fn(), session: vi.fn(), signOut: vi.fn(), clear: vi.fn(), native: vi.fn(),
}));
vi.mock('expo-web-browser', () => ({}));
vi.mock('./supabase', () => ({ supabase: {
  auth: { getSession: m.session, signOut: m.signOut }, functions: { invoke: m.invoke },
} }));
vi.mock('./identityLinking', () => ({ connectIdentity: vi.fn() }));
vi.mock('./nativeSocialAuth', () => ({ clearNativeProviderSessions: m.native, signInWithNativeProvider: vi.fn() }));
vi.mock('./pushNotifications', () => ({ unregisterCurrentPushDevice: vi.fn() }));
vi.mock('./deletedAccountData', () => ({ clearDeletedAccountData: m.clear }));
import { deleteCurrentAccount } from './auth';
beforeEach(() => {
  vi.clearAllMocks();
  m.session.mockResolvedValue({ data: { session: { user: { id: 'alice' } } } });
  m.invoke.mockResolvedValue({ data: { deleted: true }, error: null });
  m.signOut.mockResolvedValue({ error: null });
  m.clear.mockResolvedValue();
  m.native.mockResolvedValue();
});
it('clears only the authenticated account after confirmed server deletion', async () => {
  expect(await deleteCurrentAccount()).toEqual({ deleted: true, localCleanupPending: false });
  expect(m.clear).toHaveBeenCalledWith('alice');
  expect(m.invoke.mock.invocationCallOrder[0]).toBeLessThan(m.clear.mock.invocationCallOrder[0]);
  expect(m.signOut).toHaveBeenCalledWith({ scope: 'local' });
});
it('retains saved data and session if deletion is blocked by a pending reward', async () => {
  const error = { context: { json: async () => ({ code: 'PAYOUT_PENDING' }) } };
  m.invoke.mockResolvedValue({ error });
  await expect(deleteCurrentAccount()).rejects.toMatchObject({ code: 'PAYOUT_PENDING' });
  expect(m.clear).not.toHaveBeenCalled();
  expect(m.signOut).not.toHaveBeenCalled();
});
it('still signs out after server deletion when device cleanup needs retry', async () => {
  m.clear.mockRejectedValue(Error('Disk unavailable'));
  expect((await deleteCurrentAccount()).localCleanupPending).toBe(true);
  expect(m.signOut).toHaveBeenCalledOnce();
});
it('does not send a deletion without an account identity', async () => {
  m.session.mockResolvedValue({ data: { session: null } });
  await expect(deleteCurrentAccount()).rejects.toThrow('sign in');
  expect(m.invoke).not.toHaveBeenCalled();
});
