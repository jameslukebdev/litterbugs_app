import 'server-only';
import { lookupReportTown } from './report-town-lookup';
import type { ReportCommunity } from './report-communities';

/** What a report page may say about where a report is: a town, never an address or coordinates. */
export type PublicReportPlace = {
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
 * The town for a report. When the report's community is a county named after its main town (Boone, for
 * all of Watauga County), that town names it, as the old Boone boundary did, so report addresses keep
 * their "boone-north-carolina" words. Anywhere else the town is the one the community job stored for the
 * report's spot, so the page, its redirects and the sitemap always agree. Only a report the job has not
 * reached yet (its first minute) falls back to a live lookup.
 */
export async function publicReportPlace(
  latitude: number | null, longitude: number | null, waitMs: number, community?: ReportCommunity | null,
): Promise<PublicReportPlace | null> {
  if (community && community.kind === 'county' && community.name !== community.areaName && community.regionName) {
    const localityLabel = `${community.name}, ${community.regionName}`;
    return { label: `${localityLabel}, ${community.countryName}`, localityLabel, locality: community.name,
      region: community.regionName, countryCode: community.countryCode };
  }
  if (community?.town) {
    const { locality, region, country, countryCode } = community.town;
    if (!locality || !region || !country || !countryCode) return null;
    const localityLabel = `${locality}, ${region}`;
    return { label: `${localityLabel}, ${country}`, localityLabel, locality, region, countryCode };
  }
  const town = await lookupReportTown(latitude, longitude, waitMs);
  if (!town) return null;
  const localityLabel = `${town.locality}, ${town.region}`;
  return { label: `${localityLabel}, ${town.country}`, localityLabel, locality: town.locality, region: town.region, countryCode: town.countryCode };
}
