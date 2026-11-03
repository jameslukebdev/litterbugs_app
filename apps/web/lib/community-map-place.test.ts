import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { communityMapPlace } from './community-map-place';
import { inBoundary } from './place-geography';
it('restores the exact editorial polygon instead of a new geocoded city boundary', () => {
  const place = communityMapPlace('community-us-nc-boone')!;
  expect(place.label).toBe('Boone');
  expect(inBoundary({ latitude: 36.2168, longitude: -81.6746 }, place.geometry!)).toBe(true);
  expect(inBoundary({ latitude: 48.8566, longitude: 2.3522 }, place.geometry!)).toBe(false);
});
it('leaves normal map/search requests alone and rejects unknown community areas', () => {
  for (const area of [undefined, 'ChIJnormal', 'community-unknown', ['community-us-nc-boone']]) expect(communityMapPlace(area)).toBeNull();
});
