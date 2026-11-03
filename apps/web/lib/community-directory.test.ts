import { expect, it } from 'vitest';
import { communityDirectory, communityHref, communityInterestHref, findCommunity, isIndexableCommunity, publishedCommunities } from './community-directory';
import { resourcesForCommunity } from './community-resources';

it('resolves aliases to the same canonical community and interest section', () => {
  const community = findCommunity('  Boone, NC.  ')!;
  expect(community).toBe(communityDirectory[0]);
  expect(findCommunity('28607')).toBe(community);
  expect(communityHref(community.slug)).toBe(community.href);
  expect(communityInterestHref(community, 'groups')).toBe(`${community.href}#groups`);
  expect(communityInterestHref(community, 'results')).toBe(`${community.href}#results`);
  expect(communityInterestHref(community, 'all')).toBe(community.href);
});
it('does not invent hubs for other places or conflate identically named towns', () => {
  expect(findCommunity('Boone, Iowa')).toBeUndefined();
  expect(findCommunity('London, UK')).toBeUndefined();
  expect(communityHref('unknown')).toBeNull();
  expect(resourcesForCommunity('unknown')).toEqual([]);
});
it('requires an explicit publication and editorial review decision for indexing', () => {
  const community = communityDirectory[0];
  expect(publishedCommunities()).toContain(community);
  expect(isIndexableCommunity(community)).toBe(true);
  expect(isIndexableCommunity({ ...community, publication: 'draft' })).toBe(false);
  expect(isIndexableCommunity({ ...community, searchApproved: false })).toBe(false);
  expect(isIndexableCommunity({ ...community, reviewedAt: null })).toBe(false);
  expect(resourcesForCommunity(community.slug).map(item => item.id)).toEqual(community.resourceIds);
});

it('uses city names for all community display names', () => {
  for (const community of communityDirectory) {
    expect(community.name).toBe(community.locality);
    expect(community.label).not.toMatch(/\barea\b/i);
  }
});
