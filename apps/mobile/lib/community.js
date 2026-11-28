import { supabase } from './supabase';
import { edgeFunctionErrorMessage } from './edgeFunctionError';

/**
 * Leaderboards and tips, from the same public database functions the website uses
 * (apps/web/lib/community-leaderboards.ts and lib/tips.ts). Names are already short ("Maya R.").
 */

export const BOARDS = ['clean', 'report', 'fund'];
export const PERIODS = ['month', 'all'];

/** Each board's bug and words: Clean = butterfly, Report = dragonfly, Fund = bee, as everywhere else. */
export const BOARD_COPY = Object.freeze({
  clean: { tab: 'Cleaners', bug: 'butterfly', one: 'cleanup', many: 'cleanups', none: 'No cleanups', join: 'Clean one spot', role: 'cleaner' },
  report: { tab: 'Reporters', bug: 'dragonfly', one: 'report', many: 'reports', none: 'No reports', join: 'Report one spot', role: 'reporter' },
  fund: { tab: 'Funders', bug: 'bee', one: 'cleanup funded', many: 'cleanups funded', none: 'No cleanups funded', join: 'Fund one cleanup', role: null },
});

/** A month board with fewer people than this opens on All time instead. */
export const FULL_MONTH = 3;

export const ordinal = (n) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
export const daysLeftLabel = (days) => (days <= 0 ? 'Ends today' : days === 1 ? '1 day left' : `${days} days left`);

/** The month's name and days left, counted in the community's time zone (Eastern for Global). */
export function monthInfo(timeZone = 'America/New_York', now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(now).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
  const lastDay = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(parts.year, parts.month - 1, 1)));
  return { monthName, daysLeft: lastDay - parts.day };
}

/** The month board unless it has fewer than three people; then All time. */
export function defaultPeriod(boards, board) {
  return (boards?.[board]?.month?.length ?? 0) >= FULL_MONTH ? 'month' : 'all';
}

/** The first board with anyone on it, so a new town doesn't open on an empty board. */
export function defaultBoard(boards) {
  return BOARDS.find((board) => (boards?.[board]?.all?.length ?? 0) > 0) ?? 'clean';
}

/** "Boone, NC" in the US; "Mar del Plata, Argentina" elsewhere. */
export function communityLabel(community) {
  return community.country_code === 'US' && community.region_code
    ? `${community.name}, ${community.region_code.split('-')[1]}`
    : `${community.name}${community.country_name ? `, ${community.country_name}` : ''}`;
}

function checked({ data, error }) {
  if (error) throw new Error(error.message || 'Something went wrong. Please try again.');
  return data;
}

const toRow = (row) => ({
  place: row.place, profileId: row.profile_id, name: row.name, score: row.score,
  rankPoints: row.rank_points, communityName: row.community_name,
});

/** Every board and period for a community slug, or everywhere with `null`. */
export async function loadBoards(community = null) {
  const pairs = BOARDS.flatMap((board) => PERIODS.map((period) => [board, period]));
  const rows = await Promise.all(pairs.map(([board, period]) => supabase.rpc('community_leaderboard', {
    p_community: community, p_board: board, p_period: period, p_limit: 100,
  }).then(checked)));
  const boards = { clean: {}, report: {}, fund: {} };
  pairs.forEach(([board, period], index) => { boards[board][period] = (rows[index] ?? []).map(toRow); });
  return boards;
}

/** Every public community, most active first. */
export async function loadCommunities() {
  const rows = checked(await supabase.rpc('community_directory', {})) ?? [];
  return rows.map((row) => ({ ...row, label: communityLabel(row) }))
    .sort((a, b) => (b.month_cleanups + b.month_reports) - (a.month_cleanups + a.month_reports)
      || (b.cleanups + b.accepted_reports) - (a.cleanups + a.accepted_reports));
}

/** The signed-in member's own communities (where they report and clean), most active first. */
export async function loadMyCommunities() {
  const { data, error } = await supabase.rpc('my_communities', { p_limit: 4 });
  if (error) return [];
  return (data ?? []).map((row) => ({ ...row, label: communityLabel(row) }));
}

const PROFILE_ID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

/** Of these people, the ones who can be tipped right now (payouts ready and tips switched on). */
export async function loadTipEligible(profileIds) {
  const ids = [...new Set((profileIds ?? []).filter((id) => PROFILE_ID.test(String(id))))].slice(0, 200);
  if (!ids.length) return new Set();
  const { data, error } = await supabase.rpc('tip_eligible_profiles', { profile_ids: ids });
  if (error || !Array.isArray(data)) return new Set();
  return new Set(data.map((row) => (typeof row === 'string' ? row : row?.tip_eligible_profiles)).filter(Boolean));
}

/** Who a tip is for: short name, photo, rank points, cleanups and reports. */
export async function loadTipRecipient(profileId) {
  if (!PROFILE_ID.test(String(profileId))) return null;
  const data = checked(await supabase.rpc('tip_recipient', { target_profile_id: profileId }));
  return (Array.isArray(data) ? data[0] : data) ?? null;
}

export const MIN_TIP_CENTS = 300;
export const MAX_TIP_CENTS = 100_000;
export const TIP_PRESETS = [5, 10, 20];

/** Service fee added on top: 50¢ plus 5%. Must match the backend and the website. */
export const tipFeeCents = (tipCents) => 50 + Math.floor((tipCents + 10) / 20);

/** Whole dollars or dollars and cents, $3 to $1,000. Returns cents, or null. */
export function parseTipAmount(input) {
  const value = String(input ?? '').trim().replace(/^\$/, '');
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(value)) return null;
  const cents = Math.round(Number(value) * 100);
  return cents >= MIN_TIP_CENTS && cents <= MAX_TIP_CENTS ? cents : null;
}

/** Starts a tip. The tip goes straight to the person; the fee is added on top. */
export async function startTip({ profileId, tipAmountCents, clientRequestId, receiptEmail, tipperName, note, role, reportId }) {
  const { data, error } = await supabase.functions.invoke('create-cleaner-tip', {
    body: {
      cleanerId: profileId, tipAmountCents, clientRequestId, role,
      ...(receiptEmail ? { receiptEmail } : {}),
      ...(tipperName ? { tipperName } : {}),
      ...(note ? { note } : {}),
      ...(reportId ? { reportId } : {}),
    },
  });
  if (error || data?.error || typeof data?.clientSecret !== 'string' || !/^pk_(live|test)_/.test(data?.publishableKey ?? '')) {
    throw new Error(await edgeFunctionErrorMessage(data, error, 'We couldn’t start your tip. No payment has been made. Please try again.'));
  }
  return data;
}
