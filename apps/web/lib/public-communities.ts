import 'server-only';
import boone from './communities/boone-postal-area.json';
import { publishedCommunities } from './community-directory';
import {
  inBoundary,
  boundsForGeometry,
  type BoundaryGeometry,
} from './place-geography';

// Editorial communities are backed by a named geographic source. Precise report
// coordinates remain server-side; only these general labels leave this module.
const boundaries: Record<string, { geometry: BoundaryGeometry; source: string }> = {
  'us-nc-boone': { geometry: boone.feature.geometry as BoundaryGeometry, source: boone.source },
};
export const communities = publishedCommunities().flatMap(community => {
  const boundary = boundaries[community.slug];
  return boundary ? [{ ...community, ...boundary }] : [];
});

export function publicCommunityForPoint(
  latitude: number | null,
  longitude: number | null,
) {
  if (
    latitude === null ||
    longitude === null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  )
    return null;
  const place = communities.find((item) =>
    inBoundary({ latitude, longitude }, item.geometry),
  );
  return place ? { slug: place.slug, label: place.label, localityLabel: `${place.locality}, ${place.administrativeArea}` } : null;
}
export function communityBounds(slug: string) {
  const community = communities.find((item) => item.slug === slug);
  return community ? boundsForGeometry(community.geometry) : null;
}
