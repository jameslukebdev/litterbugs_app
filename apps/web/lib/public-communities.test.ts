import { expect, it, vi } from 'vitest';
import { publishedCommunities } from './community-directory';
vi.mock('server-only', () => ({}));
import { communityBounds, publicCommunityForPoint } from './public-communities';
it('exposes only a general locality for a point inside the verified postal boundary', () => {
  const result = publicCommunityForPoint(36.2168, -81.6746);
  expect(result).toEqual({
    slug: 'us-nc-boone',
    label: 'Boone, North Carolina, United States',
    localityLabel: 'Boone, North Carolina',
  });
  expect(result).not.toHaveProperty('latitude');
  expect(result).not.toHaveProperty('longitude');
});
it('does not label unrelated, missing or invalid coordinates as Boone', () => {
  expect(publicCommunityForPoint(48.8566, 2.3522)).toBeNull();
  expect(publicCommunityForPoint(null, null)).toBeNull();
  expect(publicCommunityForPoint(NaN, -81)).toBeNull();
});

it('requires server-side geography for each published community', () => {
  for (const community of publishedCommunities()) {
    expect(communityBounds(community.slug)).not.toBeNull();
  }
});
