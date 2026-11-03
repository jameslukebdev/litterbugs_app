import type { Community } from './community-directory';
export type CommunityListingKind = 'available' | 'completed' | 'fundable';
export function communityListingParams(params: { page?: string | string[]; status?: string | string[] }) {
  const page = params.page === undefined ? 1 : typeof params.page === 'string' && /^[1-9]\d{0,3}$/.test(params.page) && Number(params.page) <= 1000 ? Number(params.page) : null;
  const status = params.status ?? 'available';
  if (page === null || !['available', 'completed', 'fundable'].includes(String(status)) || Array.isArray(status)) return null;
  return { page, status: status as CommunityListingKind };
}
export function communityListingHref(community: Community, status: CommunityListingKind = 'available', page = 1) {
  const query = new URLSearchParams({ status });
  if (page > 1) query.set('page', String(page));
  return `${community.href}/cleanups?${query}`;
}
export function communityMapHref(community: Community, status: 'available' | 'completed' = 'available') {
  const [path, search] = community.mapHref.split('?');
  const query = new URLSearchParams(search);
  query.set('area', `community-${community.slug}`);
  query.set('status', status);
  return `${path}?${query}`;
}
