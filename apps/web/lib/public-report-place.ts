import 'server-only';
import { getCommunity } from './community-directory';
import { publicCommunityForPoint } from './public-communities';
import { lookupReportTown } from './report-town-lookup';

/** What a report page may say about where a report is: a town, never an address or coordinates. */
export type PublicReportPlace = {
  /** Editorial community, when the report sits inside one. */
  communitySlug?: string;
  /** "Boone, North Carolina, United States" */
  label: string;
  /** "Boone, North Carolina" */
  localityLabel: string;
  locality: string;
  region: string;
  countryCode: string;
};

/** How long a report page waits for a town it has not looked up before. */
export const PAGE_TOWN_WAIT_MS = 2500;
/** Lists, redirects and the sitemap only use a town that is already known. */
export const LIST_TOWN_WAIT_MS = 300;

/**
 * The town for a report. An editorial community wins when the report is inside
 * one; anywhere else the town comes from the OpenStreetMap lookup.
 */
export async function publicReportPlace(latitude: number | null, longitude: number | null, waitMs: number): Promise<PublicReportPlace | null> {
  const community = publicCommunityForPoint(latitude, longitude);
  if (community) {
    const record = getCommunity(community.slug);
    if (record) {
      return { communitySlug: community.slug, label: community.label, localityLabel: community.localityLabel,
        locality: record.locality, region: record.administrativeArea, countryCode: record.countryCode };
    }
  }
  const town = await lookupReportTown(latitude, longitude, waitMs);
  if (!town) return null;
  const localityLabel = `${town.locality}, ${town.region}`;
  return { label: `${localityLabel}, ${town.country}`, localityLabel, locality: town.locality, region: town.region, countryCode: town.countryCode };
}
