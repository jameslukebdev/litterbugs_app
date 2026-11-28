import 'server-only';
import { cache } from 'react';
import { createPublicClient } from './supabase/public';

/** The community a report belongs to (database: public.community_for_reports). */
export type ReportCommunity = {
  slug: string;
  path: string;
  name: string;
  kind: 'city' | 'county' | 'region';
  areaName: string;
  countryCode: string;
  countryName: string;
  regionCode: string | null;
  regionName: string | null;
  /** Whether the community's page is public (it has at least one accepted report). */
  isPublic: boolean;
  /**
   * The town at the report's spot from the community job's stored OpenStreetMap lookup (same settings the
   * report pages used: ~1 km, zoom 10, English). Null when the lookup has not run yet; a lookup with no
   * town (a rural spot) gives `{ locality: null }`.
   */
  town: { locality: string | null; region: string | null; country: string | null; countryCode: string | null } | null;
};

type Row = {
  report_id: string; slug: string; path: string; name: string; kind: ReportCommunity['kind']; area_name: string;
  country_code: string; country_name: string; region_code: string | null; region_name: string | null; is_public: boolean;
  town_known: boolean | null; town: string | null; town_region: string | null; town_country: string | null; town_country_code: string | null;
};
type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
// The generated database types predate this function; the row shape above is checked instead.
const rpc: Rpc = (name, args) => (createPublicClient() as unknown as { rpc: Rpc }).rpc(name, args);

const BATCH = 500;

/** Communities for many reports in as few requests as possible. Missing reports have no community yet. */
export async function loadReportCommunities(ids: string[]): Promise<Map<string, ReportCommunity>> {
  const result = new Map<string, ReportCommunity>();
  const unique = [...new Set(ids)];
  for (let start = 0; start < unique.length; start += BATCH) {
    const { data, error } = await rpc('community_for_reports', { p_report_ids: unique.slice(start, start + BATCH) });
    if (error) throw new Error(error.message);
    for (const row of (data as Row[] | null) ?? []) {
      result.set(row.report_id, {
        slug: row.slug, path: row.path, name: row.name, kind: row.kind, areaName: row.area_name,
        countryCode: row.country_code, countryName: row.country_name, regionCode: row.region_code, regionName: row.region_name,
        isPublic: row.is_public,
        town: row.town_known
          ? { locality: row.town, region: row.town_region, country: row.town_country, countryCode: row.town_country_code }
          : null,
      });
    }
  }
  return result;
}

/** One report's community, shared by everything that renders the same request. */
export const loadReportCommunity = cache(async (reportId: string): Promise<ReportCommunity | null> => {
  try {
    return (await loadReportCommunities([reportId])).get(reportId) ?? null;
  } catch {
    // A missing community only removes a link and falls back to the town lookup.
    return null;
  }
});
