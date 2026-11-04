import { getCommunity, publishedCommunities, type Community } from './community-directory';

export function communityReturnPath(value: unknown) {
  return typeof value === 'string' && publishedCommunities().some(community => community.href === value) ? value : null;
}
export function communityReportHref(community: Community) {
  return `/report?${new URLSearchParams({ community: community.slug, area: `community-${community.slug}`, returnTo: community.href })}`;
}
export function reportEntryContext(slug: unknown) {
  const community = typeof slug === 'string' ? getCommunity(slug) : undefined;
  if (!community || community.publication !== 'published') return null;
  return { community, next: communityReportHref(community), area: `community-${community.slug}`, returnTo: community.href };
}
export function communityReportMapHref(reportId: string, communitySlug?: string, intent?: 'fund' | 'clean' | 'locate') {
  const query = new URLSearchParams({ report: reportId });
  const context = reportEntryContext(communitySlug);
  if (context) { query.set('area', context.area); query.set('returnTo', context.returnTo); }
  if (intent) query.set('intent', intent);
  if (intent === 'locate') query.set('view', 'map');
  return `/map?${query}`;
}
export function contributionReturnPath(report: string, contribution: string, returnTo: unknown) {
  const query = new URLSearchParams({ report, contribution });
  const community = communityReturnPath(returnTo);
  if (community) query.set('returnTo', community);
  return `/payment-return?${query}`;
}

/** Recover only recognized community entry context; never trust a general return URL. */
export function communityReturnFromEntry(next: string) {
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  const url = new URL(next, 'https://litterbugs.app');
  if (url.pathname === '/report') return reportEntryContext(url.searchParams.get('community'))?.returnTo ?? null;
  return communityReturnPath(url.searchParams.get('returnTo'));
}
export function communityReceiptReportHref(report: string, returnTo: unknown) {
  const community = publishedCommunities().find(item => item.href === communityReturnPath(returnTo));
  return community ? communityReportMapHref(report, community.slug) : `/account/reports/${encodeURIComponent(report)}?from=payments`;
}
