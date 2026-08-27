import { beforeEach, describe, expect, it, vi } from 'vitest';

const getClaims = vi.fn();
const rpc = vi.fn();

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getClaims },
    rpc,
  }),
}));

import { getAdminAccessState } from './admin-access';

beforeEach(() => {
  getClaims.mockReset();
  rpc.mockReset();
});

describe('admin server access boundary', () => {
  it('keeps a signed-out visitor outside every admin RPC', async () => {
    getClaims.mockResolvedValue({ data: { claims: null } });

    await expect(getAdminAccessState()).resolves.toBe('signed_out');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('denies a permanent account that is not an active admin member', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'member-1' } } });
    rpc.mockResolvedValueOnce({ data: false, error: null });

    await expect(getAdminAccessState()).resolves.toBe('not_authorized');
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('is_cleanup_admin_member');
  });

  it('requires AAL2 after private membership succeeds', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'admin-1' } } });
    rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: false, error: null });

    await expect(getAdminAccessState()).resolves.toBe('mfa_required');
    expect(rpc.mock.calls).toEqual([
      ['is_cleanup_admin_member'],
      ['is_cleanup_admin'],
    ]);
  });

  it('opens the inbox only after membership and AAL2 both succeed', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'admin-1' } } });
    rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: true, error: null });

    await expect(getAdminAccessState()).resolves.toBe('authorized');
  });

  it('fails closed when either authorization RPC errors', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'admin-1' } } });
    rpc.mockResolvedValueOnce({ data: null, error: new Error('membership unavailable') });
    await expect(getAdminAccessState()).resolves.toBe('not_authorized');

    rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('aal unavailable') });
    await expect(getAdminAccessState()).resolves.toBe('mfa_required');
  });
});
