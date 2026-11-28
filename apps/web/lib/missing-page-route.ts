import 'server-only';
import { createPublicClient } from './supabase/public';

/**
 * Public pages that call notFound() only after the site-wide loading screen has started streaming
 * answer with status 200, because a streamed response can't change its status. This decides,
 * before any page streams, whether one of those addresses names something that doesn't exist, so
 * the proxy can serve the not-found page with a real 404 (as it already does for reports).
 *
 * Every rule mirrors the page's own notFound() checks. Anything uncertain, and any failed lookup,
 * passes the request through: the page still makes its own checks, and an outage never turns a
 * real page into a 404.
 */
export type MissingPageVerdict = 'missing' | 'pass';

type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

export type MissingPageLookups = {
  tipRecipient(id: string): Promise<unknown | null>;
  memberExists(id: string): Promise<boolean>;
  siteHasReports(id: string): Promise<boolean>;
  communityPaths(): Promise<string[]>;
};

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
// The member page's own (looser) id check.
const MEMBER_ID = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
const COUNTRY = /^[a-z]{2}$/;
const SEGMENT = /^[a-z0-9-]{1,80}$/;
// Real pages directly under /reports/ besides report ids.
const REPORT_CHILD_PAGES = new Set(['history']);

function rpc(): Rpc {
  return (name, args) => (createPublicClient() as unknown as { rpc: Rpc }).rpc(name, args);
}

export const liveLookups: MissingPageLookups = {
  async tipRecipient(id) {
    const { data, error } = await rpc()('tip_recipient', { target_profile_id: id });
    if (error) throw new Error(error.message);
    return (Array.isArray(data) ? data[0] : data) ?? null;
  },
  async memberExists(id) {
    const { data, error } = await createPublicClient().from('profiles').select('id').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data);
  },
  async siteHasReports(id) {
    const { data, error } = await rpc()('cleanup_site_reports', { target_site_id: id });
    if (error) throw new Error(error.message);
    return Array.isArray(data) && data.length > 0;
  },
  async communityPaths() {
    const { data, error } = await rpc()('community_directory', {});
    if (error) throw new Error(error.message);
    return (data as { path: string }[] | null ?? []).map(row => row.path);
  },
};

function segments(pathname: string) {
  const trimmed = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return trimmed.split('/').slice(1).map(part => {
    try { return decodeURIComponent(part); } catch { return part; }
  });
}

export async function resolveMissingPage(url: URL, lookups: MissingPageLookups = liveLookups): Promise<MissingPageVerdict> {
  const parts = segments(url.pathname);
  try {
    switch (parts[0]) {
      case 'reports':
        // /reports/<id> with a real id is decided by the report route check; anything else at that
        // depth that isn't a known page is a missing report.
        if (parts.length === 2 && !UUID.test(parts[1]) && !REPORT_CHILD_PAGES.has(parts[1])) return 'missing';
        return 'pass';
      case 'tip':
        if (parts.length !== 2) return 'pass';
        if (!UUID.test(parts[1])) return 'missing';
        return (await lookups.tipRecipient(parts[1])) ? 'pass' : 'missing';
      case 'members':
        if (parts.length !== 2) return 'pass';
        if (!MEMBER_ID.test(parts[1])) return 'missing';
        return (await lookups.memberExists(parts[1])) ? 'pass' : 'missing';
      case 'sites':
        if (parts.length !== 2) return 'pass';
        if (!UUID.test(parts[1])) return 'missing';
        return (await lookups.siteHasReports(parts[1])) ? 'pass' : 'missing';
      case 'communities': {
        if (parts.length < 2 || parts.length > 4 || parts[1] === 'find' || parts[1] === 'rank-card') return 'pass';
        const [, country, region, place] = parts;
        if (!COUNTRY.test(country)) return 'missing';
        if (region !== undefined && !SEGMENT.test(region)) return 'missing';
        if (place !== undefined && !SEGMENT.test(place)) return 'missing';
        const prefix = `/communities/${parts.slice(1).join('/')}`;
        const paths = await lookups.communityPaths();
        const found = place !== undefined ? paths.includes(prefix) : paths.some(path => path.startsWith(`${prefix}/`));
        return found ? 'pass' : 'missing';
      }
      case 'cleanups': {
        if (parts.length !== 1) return 'pass';
        const pages = url.searchParams.getAll('page');
        if (pages.length === 0) return 'pass';
        const [value] = pages;
        if (pages.length > 1 || !/^[1-9]\d{0,3}$/.test(value) || Number(value) > 1000) return 'missing';
        return 'pass';
      }
      default:
        return 'pass';
    }
  } catch {
    return 'pass';
  }
}
