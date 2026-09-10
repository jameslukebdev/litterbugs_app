import { describe, it, expect, vi } from 'vitest';
import { createAppleSignIn } from './appleSignIn';

const setup = () => {
  const apple = { isAvailableAsync: vi.fn().mockResolvedValue(true),
    AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
    signInAsync: vi.fn().mockResolvedValue({ identityToken: 'apple-token', fullName: { givenName: 'Test', familyName: 'Person' } }) };
  const auth = { signInWithIdToken: vi.fn().mockResolvedValue({ data: { user: { user_metadata: {} } }, error: null }), updateUser: vi.fn().mockResolvedValue({ error: null }) };
  return { apple, auth, signIn: createAppleSignIn({ apple, auth, createNonce: () => 'raw-nonce', hashNonce: async () => 'hashed-nonce' }) };
};
describe('Apple credential exchange', () => {
  it('binds the Apple token to the original nonce and preserves the first consent name', async () => {
    const { signIn, apple, auth } = setup();
    expect(await signIn()).toEqual({ cancelled: false });
    expect(apple.signInAsync).toHaveBeenCalledWith({ requestedScopes: [0, 1], nonce: 'hashed-nonce' });
    expect(auth.signInWithIdToken).toHaveBeenCalledWith({ provider: 'apple', token: 'apple-token', nonce: 'raw-nonce' });
    expect(auth.updateUser).toHaveBeenCalledWith({ data: { full_name: 'Test Person' } });
  });
  it('cancels without exchanging credentials', async () => {
    const { signIn, apple, auth } = setup();
    apple.signInAsync.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' });
    expect(await signIn()).toEqual({ cancelled: true });
    expect(auth.signInWithIdToken).not.toHaveBeenCalled();
  });
  it('rejects a missing token before touching the session', async () => {
    const { signIn, apple, auth } = setup();
    apple.signInAsync.mockResolvedValue({ identityToken: null });
    await expect(signIn()).rejects.toThrow('didn’t finish');
    expect(auth.signInWithIdToken).not.toHaveBeenCalled();
  });
  it('does not report a provider rejection as successful sign in', async () => {
    const { signIn, auth } = setup();
    auth.signInWithIdToken.mockResolvedValue({ error: new Error('invalid nonce') });
    await expect(signIn()).rejects.toThrow('invalid nonce');
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it('preserves an existing profile name on repeat sign in', async () => {
    const { signIn, auth } = setup();
    auth.signInWithIdToken.mockResolvedValue({ data: { user: { user_metadata: { full_name: 'Existing' } } } });
    await signIn();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it('does not fail a completed login when the optional name save is offline', async () => {
    const { signIn, auth } = setup();
    auth.updateUser.mockRejectedValue(new Error('offline'));
    expect(await signIn()).toEqual({ cancelled: false });
  });
  it('does not request credentials on unsupported devices', async () => {
    const { signIn, apple } = setup();
    apple.isAvailableAsync.mockResolvedValue(false);
    await expect(signIn()).rejects.toThrow('isn’t available');
    expect(apple.signInAsync).not.toHaveBeenCalled();
  });
});
