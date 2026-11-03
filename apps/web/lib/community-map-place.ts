import 'server-only';
import { communities } from './public-communities';
import { boundsForGeometry, type SearchPlace } from './place-geography';
export function communityMapPlace(area: string | string[] | undefined): SearchPlace | null {
  if (typeof area !== 'string' || !area.startsWith('community-')) return null;
  const community = communities.find(item => item.slug === area.slice('community-'.length));
  if (!community) return null;
  const bounds = boundsForGeometry(community.geometry);
  return { id: area, label: community.name, subtitle: community.boundaryDescription, bounds,
    latitude: (bounds.north + bounds.south) / 2, longitude: (bounds.east + bounds.west) / 2,
    geometry: community.geometry };
}
