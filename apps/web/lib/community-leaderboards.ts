import 'server-only';
import { cache } from 'react';
import { createPublicClient } from './supabase/public';

/**
 * Automatic communities and their leaderboards (supabase/migrations/20261115160657_community_leaderboards.sql).
 * Everything here is public: short names ("Maya R."), counts and community records. Full names, report
 * coordinates and the report-to-community links stay in the database.
 */

export const BOARDS = ['clean', 'report', 'fund'] as const;
export type Board = (typeof BOARDS)[number];
export type Period = 'month' | 'all';

export type CommunityRecord = {
  slug: string;
  path: string;
  name: string;
  kind: 'city' | 'county' | 'region';
  areaName: string;
  countryCode: string;
  countryName: string;
  regionCode: string | null;
  regionName: string | null;
  latitude: number | null;
  longitude: number | null;
  timeZone: string;
  acceptedReports: number;
  cleanups: number;
  monthReports: number;
  monthCleanups: number;
  firstReportAt: string | null;
  lastActivityAt: string | null;
  isIndexable: boolean;
};

export type LeaderboardRow = {
  place: number;
  profileId: string;
  name: string;
  score: number;
  rankPoints: number;
  communityName: string | null;
  communityPath: string | null;
};

export type Champion = { month: string; name: string; score: number; rankPoints: number; profileId: string };

/** All six board/period combinations, so switching on the page needs no extra request. */
export type Boards = Record<Board, Record<Period, LeaderboardRow[]>>;

type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
// The generated database types predate these functions; calls are checked by the shapes below instead.
const rpc: Rpc = (name, args) => (createPublicClient() as unknown as { rpc: Rpc }).rpc(name, args);

type DirectoryRow = {
  slug: string; path: string; name: string; kind: CommunityRecord['kind']; area_name: string; country_code: string; country_name: string;
  region_code: string | null; region_name: string | null; latitude: number | null; longitude: number | null; time_zone: string;
  accepted_reports: number; cleanups: number; month_reports: number; month_cleanups: number;
  first_report_at: string | null; last_activity_at: string | null; is_indexable: boolean;
};

function toCommunity(row: DirectoryRow): CommunityRecord {
  return {
    slug: row.slug, path: row.path, name: row.name, kind: row.kind, areaName: row.area_name,
    countryCode: row.country_code, countryName: row.country_name, regionCode: row.region_code, regionName: row.region_name,
    latitude: row.latitude, longitude: row.longitude, timeZone: row.time_zone,
    acceptedReports: row.accepted_reports, cleanups: row.cleanups, monthReports: row.month_reports, monthCleanups: row.month_cleanups,
    firstReportAt: row.first_report_at, lastActivityAt: row.last_activity_at, isIndexable: row.is_indexable,
  };
}

/** Every public community (at least one accepted report), most active first. Empty on a loading problem. */
export const loadCommunityDirectory = cache(async (): Promise<{ communities: CommunityRecord[]; unavailable: boolean }> => {
  try {
    const { data, error } = await rpc('community_directory', {});
    if (error) throw new Error(error.message);
    return { communities: (data as DirectoryRow[] ?? []).map(toCommunity), unavailable: false };
  } catch (error) {
    console.error('Community directory could not load', error);
    return { communities: [], unavailable: true };
  }
});

/** One public community by its page path, e.g. /communities/us/nc/boone. */
export const loadCommunity = cache(async (path: string): Promise<CommunityRecord | null> => {
  const { data, error } = await rpc('community_directory', { p_path: path });
  if (error) throw new Error(error.message);
  const row = (data as DirectoryRow[] | null)?.[0];
  return row ? toCommunity(row) : null;
});

type BoardRow = { place: number; profile_id: string; name: string; score: number; rank_points: number; community_name: string | null; community_path: string | null };

async function loadBoard(community: string | null, board: Board, period: Period): Promise<LeaderboardRow[]> {
  const { data, error } = await rpc('community_leaderboard', { p_community: community, p_board: board, p_period: period, p_limit: 100 });
  if (error) throw new Error(error.message);
  return (data as BoardRow[] ?? []).map(row => ({
    place: row.place, profileId: row.profile_id, name: row.name, score: row.score, rankPoints: row.rank_points,
    communityName: row.community_name, communityPath: row.community_path,
  }));
}

/** Every board for a community (or everywhere, with `null`). */
export const loadBoards = cache(async (community: string | null): Promise<Boards> => {
  const pairs = BOARDS.flatMap(board => (['month', 'all'] as const).map(period => [board, period] as const));
  const rows = await Promise.all(pairs.map(([board, period]) => loadBoard(community, board, period)));
  const boards = { clean: {}, report: {}, fund: {} } as Boards;
  pairs.forEach(([board, period], index) => { boards[board][period] = rows[index]; });
  return boards;
});

type ChampionRow = { month: string; name: string; score: number; rank_points: number; profile_id: string };

export const loadChampions = cache(async (community: string): Promise<Record<Board, Champion[]>> => {
  const lists = await Promise.all(BOARDS.map(async board => {
    const { data, error } = await rpc('community_past_champions', { p_community: community, p_board: board, p_limit: 12 });
    if (error) throw new Error(error.message);
    return (data as ChampionRow[] ?? []).map(row => ({ month: row.month, name: row.name, score: row.score, rankPoints: row.rank_points, profileId: row.profile_id }));
  }));
  return { clean: lists[0], report: lists[1], fund: lists[2] };
});

/** "Boone, NC" in the US; "Mar del Plata, Argentina" elsewhere. */
export function communityLabel(community: Pick<CommunityRecord, 'name' | 'countryCode' | 'countryName' | 'regionCode'>) {
  if (community.countryCode === 'US' && community.regionCode) return `${community.name}, ${community.regionCode.split('-')[1]}`;
  return `${community.name}, ${community.countryName}`;
}

/** "the Boone area" for counties named after their main town; the place's own name otherwise. */
export function communityAreaPhrase(community: Pick<CommunityRecord, 'name' | 'kind' | 'areaName'>) {
  return community.kind === 'county' && community.name !== community.areaName ? `the ${community.name} area` : community.name;
}

/** One plain sentence for search results and AI answers, e.g. "In November 2026, Litterbugs members in the Boone area reported 23 spots and cleaned up 9." */
export function communityStatsSentence(community: CommunityRecord, now = new Date()) {
  const month = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: community.timeZone }).format(now);
  const where = communityAreaPhrase(community);
  const spots = (n: number) => `${n} ${n === 1 ? 'spot' : 'spots'}`;
  if (community.monthReports || community.monthCleanups) {
    return `In ${month}, Litterbugs members in ${where} reported ${spots(community.monthReports)} and cleaned up ${community.monthCleanups}.`;
  }
  return `Litterbugs members in ${where} have reported ${spots(community.acceptedReports)} and cleaned up ${community.cleanups} so far.`;
}

/** The month's name, its last day and how many days are left, in the community's own time zone. */
export function monthInfo(timeZone: string, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(now).map(part => [part.type, part.value]));
  const year = Number(parts.year), month = Number(parts.month), day = Number(parts.day);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
  return { monthName, monthEnds: `${monthName} ${lastDay}`, daysLeft: lastDay - day };
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The most telling recent number for a town: this month's cleanups, else this month's reports, else totals. */
export function townActivity(community: Pick<CommunityRecord, 'monthCleanups' | 'monthReports' | 'cleanups' | 'acceptedReports'>) {
  if (community.monthCleanups) return `${count(community.monthCleanups, 'cleanup', 'cleanups')} this month`;
  if (community.monthReports) return `${count(community.monthReports, 'report', 'reports')} this month`;
  return community.cleanups ? `${count(community.cleanups, 'cleanup', 'cleanups')} so far` : `${count(community.acceptedReports, 'report', 'reports')} so far`;
}

/** Busiest first: this month's cleanups, then this month's reports, then all-time cleanups and reports. */
export function byActivity(a: CommunityRecord, b: CommunityRecord) {
  return b.monthCleanups - a.monthCleanups || b.monthReports - a.monthReports || b.cleanups - a.cleanups
    || b.acceptedReports - a.acceptedReports || a.name.localeCompare(b.name);
}

/** A country or state that has at least one public town: /communities/us or /communities/us/nc. */
export type PlaceGroup = {
  path: string;
  name: string;
  countryName: string;
  towns: CommunityRecord[];
  isIndexable: boolean;
  lastActivityAt: string | null;
};

/** "/communities/us" (country) or "/communities/us/nc" (state) for a town at "/communities/us/nc/boone". */
export function placePathOf(path: string, level: 'country' | 'region') {
  return path.split('/').slice(0, level === 'country' ? 3 : 4).join('/');
}

/** Towns grouped by country or by state, the groups with the most towns first. */
export function groupCommunities(communities: CommunityRecord[], level: 'country' | 'region'): PlaceGroup[] {
  const groups = new Map<string, PlaceGroup>();
  for (const community of communities) {
    const path = placePathOf(community.path, level);
    const group = groups.get(path) ?? {
      path, name: level === 'country' ? community.countryName : community.regionName ?? community.countryName,
      countryName: community.countryName, towns: [], isIndexable: false, lastActivityAt: null,
    };
    group.towns.push(community);
    group.isIndexable ||= community.isIndexable;
    if (community.lastActivityAt && (!group.lastActivityAt || community.lastActivityAt > group.lastActivityAt)) group.lastActivityAt = community.lastActivityAt;
    groups.set(path, group);
  }
  for (const group of groups.values()) group.towns.sort(byActivity);
  return [...groups.values()].sort((a, b) => b.towns.length - a.towns.length || a.name.localeCompare(b.name));
}

/** "5 towns" */
export function townCount(n: number) {
  return count(n, 'town', 'towns');
}

/** The places above a town, for breadcrumbs: its country, then its state (skipped where there is none). */
export function placeTrail(community: Pick<CommunityRecord, 'path' | 'countryName' | 'regionName'>) {
  const steps = [{ name: community.countryName, path: placePathOf(community.path, 'country') }];
  const region = placePathOf(community.path, 'region');
  if (community.regionName && !region.endsWith('/all')) steps.push({ name: community.regionName, path: region });
  return steps;
}
