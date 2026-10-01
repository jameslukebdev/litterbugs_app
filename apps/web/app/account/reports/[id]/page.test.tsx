import { beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './page';
const state = vi.hoisted(() => ({ userId: 'owner' as string | null, report: {} as Record<string, unknown>, participant: false, error: null as unknown }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); }, notFound: () => { throw new Error('not-found'); } }));
vi.mock('./report-page', () => ({ AccountReport: () => null }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getClaims: async () => ({ data: { claims: state.userId ? { sub: state.userId } : null } }) },
  from: () => {
    const query = { select: () => query, eq: () => query,
      maybeSingle: async () => ({ data: state.report, error: state.error }),
      limit: async () => ({ data: state.participant ? [{ id: 'participation' }] : [], error: state.error }),
    }; return query;
  },
}) }));
const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const open = (from = 'reports') => Page({ params: Promise.resolve({ id }), searchParams: Promise.resolve({ from }) });
beforeEach(() => {
  state.userId = 'owner'; state.participant = false; state.error = null;
  state.report = { id, user_id: 'owner', is_published: true, is_sample: false, cancelled_at: null, expired_at: '2020-01-01', cleanup_state: 'available', expires_at: '2020-01-01' };
});
describe('authenticated report history', () => {
  it('requires an account before querying historical reports', async () => {
    state.userId = null;
    await expect(open()).rejects.toThrow('redirect:/sign-in?next=');
  });
  it('allows owners and cleanup/payment participants to open expired history', async () => {
    expect((await open()).props.back).toBe('/account/reports');
    state.userId = 'cleaner'; state.participant = true;
    expect((await open('history')).props.back).toBe('/account/activity?view=history');
  });
  it('does not expose an unrelated historical report through the account route', async () => {
    state.userId = 'unrelated';
    await expect(open()).rejects.toThrow('not-found');
  });
  it('preserves the account origin when opening an ongoing cleanup past original expiry', async () => {
    state.report = { ...state.report, expired_at: null, cleanup_state: 'claimed' };
    await expect(open('history')).rejects.toThrow(`redirect:/?report=${id}&returnTo=%2Faccount%2Factivity%3Fview%3Dhistory`);
  });
  it('shows a retryable load failure instead of treating a network error as missing history', async () => {
    state.error = new Error('offline');
    await expect(open()).rejects.toThrow('could not be loaded');
  });
});
