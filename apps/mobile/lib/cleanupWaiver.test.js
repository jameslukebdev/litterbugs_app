import { beforeEach, describe, expect, it, vi } from 'vitest';
const { from, chain } = vi.hoisted(() => {
  const chain = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), maybeSingle: vi.fn() };
  return { from: vi.fn(), chain };
});
vi.mock('./supabase', () => ({ supabase: { from } }));
import { loadCurrentCleanupWaiver } from './cleanup';

beforeEach(() => {
  vi.resetAllMocks();
  from.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
});
const waiver = { waiver_version: 'v4', guidelines_version: 'v2' };
describe('versioned cleanup acceptance', () => {
  it('uses the signed-in user and both active document versions', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: waiver }).mockResolvedValueOnce({ data: { waiver_version: 'v4' } });
    await expect(loadCurrentCleanupWaiver('cleaner-1')).resolves.toEqual({ waiver, accepted: true });
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'cleaner-1');
    expect(chain.eq).toHaveBeenCalledWith('waiver_version', 'v4');
    expect(chain.eq).toHaveBeenCalledWith('guidelines_version', 'v2');
  });
  it('requires the full agreement when the current versions have not been accepted', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: waiver }).mockResolvedValueOnce({ data: null });
    await expect(loadCurrentCleanupWaiver('cleaner-1')).resolves.toEqual({ waiver, accepted: false });
  });
  it('does not skip the agreement after a failed acceptance lookup', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: waiver }).mockResolvedValueOnce({ error: new Error('offline') });
    await expect(loadCurrentCleanupWaiver('cleaner-1')).rejects.toThrow('offline');
  });
});
