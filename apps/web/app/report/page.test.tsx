import { beforeEach, expect, it, vi } from 'vitest';
import Page from './page';
import { getCommunity } from '@/lib/community-directory';
import { communityReportHref } from '@/lib/community-journey';
const identity = vi.hoisted(() => ({ claims: null as Record<string, unknown> | null }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getClaims: async () => ({ data: { claims: identity.claims } }) } }) }));
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock('@/components/map-page', () => ({ default: () => null }));
beforeEach(() => { identity.claims = null; });
it('preserves Boone through sign-in while ordinary reporting retains its destination', async () => {
  await expect(Page({ searchParams: Promise.resolve({ community: 'us-nc-boone' }) })).rejects.toThrow(`redirect:/sign-in?next=${encodeURIComponent(communityReportHref(getCommunity('us-nc-boone')!))}`);
  await expect(Page()).rejects.toThrow(`redirect:/sign-in?next=${encodeURIComponent('/report')}`);
});
it('starts the authenticated report picker in the area, without setting an exact report location', async () => {
  identity.claims = { sub: 'member' };
  const page = await Page({ searchParams: Promise.resolve({ community: 'us-nc-boone' }) });
  expect(await page.props.searchParams).toEqual({ area: 'community-us-nc-boone', returnTo: '/communities/us/nc/boone' });
});
it('does not accept a repeated community parameter or treat anonymous claims as a member', async () => {
  identity.claims = { sub: 'anonymous', is_anonymous: true };
  await expect(Page({ searchParams: Promise.resolve({ community: ['us-nc-boone'] }) })).rejects.toThrow(`redirect:/sign-in?next=${encodeURIComponent('/report')}`);
});
