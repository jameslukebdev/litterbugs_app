import 'server-only';
import { createPublicClient } from './supabase/public';
import { createClient } from './supabase/server';
import { searchPlace, type PlaceMatch } from './report-town-lookup';

/**
 * Finding a town's leaderboard (supabase/migrations/20261115170131_community_finder.sql).
 * A typed place is looked up once with OpenStreetMap, then matched to its community with the same rule
 * reports use, so "Banner Elk" finds Avery County and "Blowing Rock" finds Boone.
 */

export type FoundCommunity = { path: string; name: string; label: string };
export type PlaceSearchResult =
  | { status: 'found'; place: string; community: FoundCommunity }
  | { status: 'none'; place: string }
  | { status: 'unknown' }
  | { status: 'busy' };

type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
type CommunityRow = { slug: string; path: string; name: string; region_name: string | null; country_name?: string; country_code?: string };

/** "Boone, NC" in the US; "Mar del Plata, Argentina" elsewhere. Matches communityLabel. */
function label(name: string, regionCode: string | null, countryCode: string, countryName: string) {
  return countryCode === 'US' && regionCode ? `${name}, ${regionCode.split('-')[1]}` : `${name}, ${countryName}`;
}

/** The parts of an OpenStreetMap place the database needs, read the way report assignment reads them. */
export function placeParts(match: PlaceMatch) {
  const address = match.address;
  const countryCode = address.country_code?.toUpperCase() ?? null;
  const regionCode = (address['ISO3166-2-lvl4'] ?? address['ISO3166-2-lvl5'] ?? address['ISO3166-2-lvl6'] ?? address['ISO3166-2-lvl3'])?.toUpperCase() ?? null;
  const city = match.name || address.city || address.town || address.village || null;
  const county = address.county ?? address.state_district ?? null;
  const countryName = address.country ?? countryCode ?? '';
  return { countryCode, regionCode, city, county, countryName };
}

export async function findCommunityForPlace(query: string): Promise<PlaceSearchResult> {
  const match = await searchPlace(query).catch(() => null);
  if (match === 'busy') return { status: 'busy' };
  if (!match) return { status: 'unknown' };
  const parts = placeParts(match);
  if (!parts.countryCode) return { status: 'unknown' };
  const place = label(parts.city ?? parts.county ?? query.trim(), parts.regionCode, parts.countryCode, parts.countryName);
  const isTown = match.type && ['city', 'town', 'village', 'municipality', 'city_district', 'borough', 'suburb', 'hamlet'].includes(match.type);
  const rpc: Rpc = (name, args) => (createPublicClient() as unknown as { rpc: Rpc }).rpc(name, args);
  const { data, error } = await rpc('community_for_place', {
    p_country_code: parts.countryCode, p_region_code: parts.regionCode, p_county: parts.county,
    p_city: isTown ? parts.city : null, p_city_population: match.population,
  });
  if (error) throw new Error(error.message);
  const row = (data as CommunityRow[] | null)?.[0];
  if (!row) return { status: 'none', place };
  return { status: 'found', place, community: {
    path: row.path, name: row.name, label: label(row.name, parts.regionCode, parts.countryCode, row.country_name ?? parts.countryName),
  } };
}

export type MyCommunity = { path: string; label: string };

/** Where the signed-in person has reported, cleaned up or funded, most activity first. Empty when signed out. */
export async function loadMyCommunities(): Promise<MyCommunity[]> {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims?.claims?.sub) return [];
    const { data, error } = await (supabase as unknown as { rpc: Rpc }).rpc('my_communities', { p_limit: 4 });
    if (error) throw new Error(error.message);
    return (data as Array<CommunityRow & { country_code: string }> | null ?? []).map(row => ({
      path: row.path,
      label: row.country_code === 'US' ? `${row.name}, ${row.path.split('/')[3]?.toUpperCase()}` : row.name,
    }));
  } catch (error) {
    console.error('Your towns could not load', error);
    return [];
  }
}
