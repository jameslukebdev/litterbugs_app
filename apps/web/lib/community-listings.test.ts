import { expect, it } from 'vitest';
import { communityListingParams, communityListingHref, communityMapHref } from './community-listings';
import { getCommunity } from './community-directory';
it('validates paging and status without publishing arbitrary filtered routes', () => {
  expect(communityListingParams({})).toEqual({ page: 1, status: 'available' });
  expect(communityListingParams({ page: '2', status: 'completed' })).toEqual({ page: 2, status: 'completed' });
  for (const page of ['0', '-1', '1.5', '1001', 'abc', ['1', '2']]) expect(communityListingParams({ page })).toBeNull();
  expect(communityListingParams({ status: ['available'] })).toBeNull();
  expect(communityListingParams({ status: 'unknown' })).toBeNull();
});
it('retains local scope and status in pagination and map handoffs', () => {
  const community = getCommunity('us-nc-boone')!;
  expect(communityListingHref(community, 'completed', 2)).toBe('/communities/us/nc/boone/cleanups?status=completed&page=2');
  const url = new URL(communityMapHref(community), 'https://litterbugs.app');
  expect(url.searchParams.get('area')).toBe('community-us-nc-boone');
  expect(url.searchParams.get('status')).toBe('available');
  expect(url.searchParams.get('browse')).toBe('1');
});
