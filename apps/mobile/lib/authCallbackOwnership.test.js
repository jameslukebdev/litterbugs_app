import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ open: vi.fn(), oauth: vi.fn() }));
vi.mock('expo-web-browser', () => ({ openAuthSessionAsync: mocks.open }));
vi.mock('./supabase', () => ({ supabase: { auth: { signInWithOAuth: mocks.oauth } } }));
vi.mock('./nativeSocialAuth', () => ({ signInWithNativeProvider: async () => null, clearNativeProviderSessions: async () => {} }));
vi.mock('./pushNotifications', () => ({ unregisterCurrentPushDevice: async () => {} }));
vi.mock('./deletedAccountData', () => ({ clearDeletedAccountData: async () => {} }));
beforeEach(() => { vi.resetModules();vi.clearAllMocks();mocks.oauth.mockResolvedValue({ data: { url: 'https://facebook.com/login' } }); });
describe('browser callback ownership', () => {
  it('preserves provider error codes and suppresses a second delivery of the same rejected callback', async () => {
    const auth = await import('./auth');
    const url='litterbugs://auth/callback?error=access_denied&error_code=identity_already_exists&error_description=Identity+already+exists';
    mocks.open.mockImplementation(async () => {
      expect(auth.isBrowserAuthInProgress()).toBe(true);
      return { type: 'success', url };
    });
    await expect(auth.signInWithProvider('facebook')).rejects.toMatchObject({ code: 'identity_already_exists', message: 'Identity already exists' });
    expect(auth.isBrowserAuthInProgress()).toBe(false);
    expect(await auth.handleAuthCallbackUrl(url)).toEqual({ handled: false });
  });
  it('releases callback ownership when the browser is cancelled', async () => {
    const auth=await import('./auth');mocks.open.mockResolvedValue({ type: 'cancel' });
    expect(await auth.signInWithProvider('facebook')).toEqual({ cancelled: true });
    expect(auth.isBrowserAuthInProgress()).toBe(false);
  });
});
