/** Public editorial records only. Boundary geometry and report coordinates stay server-side.
 * Add a reviewed record here before publishing a hub; a place search never creates one.
 */
export type Community = {
  slug: string;
  href: string;
  /** Use the city name, without an area or region suffix. */
  name: string;
  locality: string;
  administrativeArea: string;
  country: string;
  countryCode: string;
  label: string;
  heading: string;
  title: string;
  description: string;
  summary: string;
  aliases: readonly string[];
  mapHref: string;
  boundaryDescription: string;
  resourceIds: readonly string[];
  publication: 'draft' | 'published';
  searchApproved: boolean;
  reviewedAt: string | null;
};

export const communityDirectory: readonly Community[] = [{
  slug: 'us-nc-boone',
  href: '/communities/us/nc/boone',
  name: 'Boone',
  locality: 'Boone',
  administrativeArea: 'North Carolina',
  country: 'United States',
  countryCode: 'US',
  label: 'Boone, North Carolina, United States',
  heading: 'Litter cleanups in Boone, NC',
  title: 'Boone, NC Litter Cleanups & Local Groups | Litterbugs',
  description: 'Find litter cleanup opportunities, local volunteer groups, and cleanup resources in Boone, NC. Report a location or explore local cleanup results.',
  summary: 'Find places that need attention, town cleanup programs, and ways to help in the High Country.',
  aliases: ['boone', 'boone area', 'boone nc', 'boone north carolina', 'boone nc united states', 'boone north carolina united states', '28607'],
  mapHref: '/map?view=map&browse=1&lat=36.2168&lng=-81.6746&zoom=12',
  boundaryDescription: 'Includes Boone and nearby locations within postal code 28607; individual reports may be outside town limits.',
  resourceIds: ['adopt-a-street', 'adopt-a-stream', 'mountaintrue', 'watauga-disposal', 'ncdot-litter'],
  publication: 'published',
  searchApproved: true,
  // Reviewed community naming and coverage copy; never use the current render date.
  reviewedAt: '2026-11-03',
}];

export function isPublishedCommunity(community: Community) {
  return community.publication === 'published';
}
export function isIndexableCommunity(community: Community) {
  return isPublishedCommunity(community) && community.searchApproved && Boolean(community.reviewedAt);
}
export function getCommunity(slug: string) {
  return communityDirectory.find(community => community.slug === slug);
}
export function communityHref(slug: string) {
  const community = getCommunity(slug);
  return community && isPublishedCommunity(community) ? community.href : null;
}
export function publishedCommunities() {
  return communityDirectory.filter(isPublishedCommunity);
}
function normalizePlace(value: string) {
  return value.toLowerCase().replace(/[,\.]/g, '').replace(/\s+/g, ' ').trim();
}
export function findCommunity(query: string) {
  const normalized = normalizePlace(query);
  return publishedCommunities().find(community => community.aliases.some(alias => normalizePlace(alias) === normalized));
}
export function communityInterestHref(community: Community, interest: 'all' | 'cleanups' | 'groups' | 'results') {
  const anchor = { all: '', cleanups: '#cleanups', groups: '#groups', results: '#results' }[interest];
  return `${community.href}${anchor}`;
}
