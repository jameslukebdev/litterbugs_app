import { expect, it, vi } from 'vitest';
import { checkAppleCredentialState } from './appleCredentialState';
const session = { access_token: 'first-session', user: { id: 'member', identities: [{ provider: 'apple', identity_data: { sub: 'apple-member' } }] } };
const setup = (state = 0) => ({
  apple: { getCredentialStateAsync: vi.fn().mockResolvedValue(state), AppleAuthenticationCredentialState: { REVOKED: 0, AUTHORIZED: 1, NOT_FOUND: 2 } },
  auth: { getSession: vi.fn().mockResolvedValue({ data: { session } }), signOut: vi.fn().mockResolvedValue({ error: null }) },
});
it('ends a session when Apple confirms its authorization was revoked', async () => {
  const deps = setup();
  await checkAppleCredentialState(deps);
  expect(deps.apple.getCredentialStateAsync).toHaveBeenCalledWith('apple-member');
  expect(deps.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
});
it('preserves a valid session and does not mistake an unavailable check for revocation', async () => {
  const deps = setup(1);
  await checkAppleCredentialState(deps);
  deps.apple.getCredentialStateAsync.mockRejectedValue(new Error('offline'));
  await checkAppleCredentialState(deps);
  expect(deps.auth.signOut).not.toHaveBeenCalled();
});
it('does not sign out a new login while an old Apple check is finishing', async () => {
  const deps = setup();
  deps.auth.getSession.mockResolvedValueOnce({ data: { session } }).mockResolvedValueOnce({ data: { session: { ...session, access_token: 'new-session' } } });
  await checkAppleCredentialState(deps);
  expect(deps.auth.signOut).not.toHaveBeenCalled();
});
it('ignores non-Apple accounts and stopped watchers', async () => {
  const deps = setup();
  deps.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'google-member', identities: [] } } } });
  await checkAppleCredentialState(deps);
  expect(deps.apple.getCredentialStateAsync).not.toHaveBeenCalled();
  deps.auth.getSession.mockResolvedValue({ data: { session } });
  await checkAppleCredentialState({ ...deps, isActive: () => false });
  expect(deps.apple.getCredentialStateAsync).not.toHaveBeenCalled();
});
