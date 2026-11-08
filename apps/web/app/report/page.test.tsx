import { expect, it, vi } from 'vitest';
import Page from './page';
vi.mock('@/components/map-page', () => ({ default: () => null }));
it('opens the picker for a guest without an account redirect', async () => {
  const page = await Page({});
  expect(page.props.searchParams).toBeUndefined();
  expect(page.props.initialView).toBe('map');
});
it('retains the community area without inventing an exact report location', async () => {
  const page = await Page({ searchParams: Promise.resolve({ community: 'us-nc-boone' }) });
  expect(await page.props.searchParams).toEqual({ area: 'community-us-nc-boone', returnTo: '/communities/us/nc/boone' });
});
it('does not accept repeated community parameters', async () => {
  const page = await Page({ searchParams: Promise.resolve({ community: ['us-nc-boone'] }) });
  expect(page.props.searchParams).toBeUndefined();
});
