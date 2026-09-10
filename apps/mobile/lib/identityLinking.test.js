import { describe, it, expect, vi } from 'vitest';
import { connectIdentity, identityLinkErrorMessage } from './identityLinking';
describe('connected sign-in account safety', () => {
  const setup = () => ({ provider: 'google', auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'original', identities: [{ provider: 'google' }] } } }) }, connect: vi.fn().mockResolvedValue({ cancelled: false }) });
  it('requires an authenticated user before starting provider linking', async () => {
    const deps = setup(); deps.auth.getUser.mockResolvedValue({ data: { user: null } });
    await expect(connectIdentity(deps)).rejects.toThrow('sign in again');
    expect(deps.connect).not.toHaveBeenCalled();
  });
  it('returns identities only when linking retained the original user', async () => {
    expect(await connectIdentity(setup())).toEqual({ cancelled: false, identities: [{ provider: 'google' }] });
  });
  it('does not claim success if an account switched during the flow', async () => {
    const deps = setup();deps.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'original' } } }).mockResolvedValueOnce({ data: { user: { id: 'different' } } });
    await expect(connectIdentity(deps)).rejects.toThrow('account changed');
  });
  it('leaves cancellation quiet and preserves the existing session', async () => {
    const deps = setup(); deps.connect.mockResolvedValue({ cancelled: true });
    expect(await connectIdentity(deps)).toEqual({ cancelled: true });
    expect(deps.auth.getUser).toHaveBeenCalledTimes(1);
  });
  it('does not claim a connection when the provider is absent', async () => {
    const deps = setup();deps.provider = 'facebook';
    await expect(connectIdentity(deps)).rejects.toThrow('not connected');
  });
  it('explains already-used identities without proposing deletion', () => {
    expect(identityLinkErrorMessage({ code: 'identity_already_exists' })).toContain('accounts are still separate');
  });
});
