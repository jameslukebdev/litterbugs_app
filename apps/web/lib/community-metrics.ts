import { resourcesForCommunity } from './community-resources';

export const COMMUNITY_ENGAGEMENT_EVENTS = ['community_opened', 'community_report_opened', 'community_action_started', 'community_resource_opened'] as const;
export type CommunityEngagementEvent = typeof COMMUNITY_ENGAGEMENT_EVENTS[number];
export type CommunityProperties = { community_id: string; action?: 'report' | 'fund' | 'clean'; resource_id?: string };

/** Community pages live at /communities/<country>/<state>/<place>; their id is those three parts joined. */
const COMMUNITY_PATH = /^\/communities\/([a-z]{2})\/([a-z0-9]+)\/([a-z0-9-]+)$/;
const COMMUNITY_SLUG = /^[a-z]{2}-[a-z0-9]+-[a-z0-9-]+$/;

export function publicCommunitySlug(value: unknown) {
  return typeof value === 'string' && value.length <= 120 && COMMUNITY_SLUG.test(value) ? value : null;
}
export function communityForPath(path: string) {
  const match = COMMUNITY_PATH.exec(path);
  return match ? { slug: `${match[1]}-${match[2]}-${match[3]}`, href: path } : undefined;
}
export function communityForEntry(search: string) {
  const query = new URLSearchParams(search);
  const returnTo = query.get('returnTo');
  return publicCommunitySlug(query.get('community')) ?? (returnTo ? communityForPath(returnTo)?.slug ?? null : null);
}
/** Copy only a known public community and finite action/resource values. */
export function communityProperties(value: unknown): CommunityProperties | null {
  if (!value || typeof value !== 'object') return null;
  const detail = value as Record<string, unknown>;
  const slug = publicCommunitySlug(detail.community_id);
  if (!slug) return null;
  const properties: CommunityProperties = { community_id: slug };
  if (detail.action === 'report' || detail.action === 'fund' || detail.action === 'clean') properties.action = detail.action;
  if (resourcesForCommunity(slug).some(item => item.id === detail.resource_id)) properties.resource_id = detail.resource_id as string;
  return properties;
}
export function communityClick(href: string, origin: string, slug: unknown, resourceId?: string): { event: CommunityEngagementEvent; properties: CommunityProperties } | null {
  let url: URL;
  try { url = new URL(href, origin); } catch { return null; }
  if (url.origin === origin) {
    const opened = communityForPath(url.pathname);
    if (opened && !publicCommunitySlug(slug)) return { event: 'community_opened' as const, properties: { community_id: opened.slug } };
  }
  const community = publicCommunitySlug(slug);
  if (!community) return null;
  const properties: CommunityProperties = { community_id: community };
  if (url.origin !== origin) {
    const resource = resourcesForCommunity(community).find(item => item.id === resourceId && item.href === url.href);
    return resource ? { event: 'community_resource_opened' as const, properties: { ...properties, resource_id: resource.id } } : null;
  }
  if (/^\/(?:reports|litter-reports)\/[^/]+$/.test(url.pathname)) return { event: 'community_report_opened' as const, properties };
  const action = participationLinkAction(url, origin);
  if (action) return { event: 'community_action_started', properties: { ...properties, action } };
  return null;
}


export function participationLinkAction(url: URL, origin: string): 'report' | 'fund' | 'clean' | null {
  if (url.origin !== origin) return null;
  let destination = url;
  if (url.pathname === '/sign-in') {
    const next = url.searchParams.get('next');
    if (!next?.startsWith('/') || next.startsWith('//')) return null;
    try { destination = new URL(next, origin); } catch { return null; }
    if (destination.origin !== origin) return null;
  }
  if (destination.pathname === '/report') return 'report';
  const action = destination.searchParams.get('intent');
  return destination.pathname === '/map' && (action === 'fund' || action === 'clean') ? action : null;
}
