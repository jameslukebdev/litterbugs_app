import { communityAreaPhrase, communityStatsSentence, type CommunityRecord } from './community-leaderboards';

const DESCRIPTION_MAX = 155;

/** Keep search and sharing summaries concise without trimming a sentence mid-word. */
export function communityMetaDescription(community: CommunityRecord, now = new Date()) {
  const summary = communityStatsSentence(community, now);
  const withLeaderboard = `${summary} View the cleanup leaderboard.`;
  if (withLeaderboard.length <= DESCRIPTION_MAX) return withLeaderboard;
  if (summary.length <= DESCRIPTION_MAX) return summary;

  const monthly = Boolean(community.monthReports || community.monthCleanups);
  const reports = monthly ? community.monthReports : community.acceptedReports;
  const cleanups = monthly ? community.monthCleanups : community.cleanups;
  const period = monthly
    ? `in ${new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: community.timeZone }).format(now)}`
    : 'so far';
  const activity = `${reports} ${reports === 1 ? 'report' : 'reports'}, ${cleanups} ${cleanups === 1 ? 'cleanup' : 'cleanups'} ${period}.`;

  // Prefer the full local name; use its containing area only for unusually long names.
  const places = [communityAreaPhrase(community), community.name, community.areaName, community.regionName, community.countryName];
  return places.filter(Boolean).map(place => `${place}: ${activity}`)
    .find(description => description.length <= DESCRIPTION_MAX) ?? `Litterbugs: ${activity}`;
}
