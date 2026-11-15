import { communityLabel, communityStatsSentence, loadCommunityDirectory } from '@/lib/community-leaderboards';
import { getSiteUrl } from '@/lib/env';

/** A plain-text guide to the public site for answer engines (llmstxt.org). Wording follows /about. */
export const dynamic = 'force-dynamic';

export async function GET() {
  const site = getSiteUrl();
  const communities = (await loadCommunityDirectory()).communities.filter(community => community.isIndexable)
    .map(community => `- [${communityLabel(community)} leaderboard](${site}${community.path}): ${communityStatsSentence(community)}`);
  const body = [
    '# Litterbugs',
    '',
    '> Litterbugs is a community website and mobile app where people report litter, help fund cleanups, and earn money by reporting and cleaning up litter. Each cleanup is submitted with photos and reviewed before it is shown as complete.',
    '',
    'Public report pages show a general area, never an exact address. Completed cleanups include before-and-after photos, the date, and the amounts the cleaner reported removing.',
    '',
    '## How it works',
    `- [How Litterbugs works](${site}/about): reporting, funding and cleaning, and how rewards are earned`,
    `- [Report litter](${site}/report-litter): how to add a report with photos and a location`,
    `- [Fund a cleanup](${site}/fund-a-cleanup): how contributions build a cleanup reward`,
    `- [Clean up and earn](${site}/cleaner): how to claim a site and submit a cleanup for review`,
    `- [Cleanup and reward policy](${site}/cleanup-policy): eligibility, review and payout rules`,
    `- [Cleanup safety](${site}/cleanup-safety): safety guidelines to read before cleaning`,
    `- [Photo review](${site}/photo-review): how submitted photos are reviewed`,
    '',
    '## Reports and results',
    `- [Reports needing cleanup](${site}/reports): current litter reports`,
    `- [Completed cleanups](${site}/cleanups): finished cleanups with before-and-after photos`,
    `- [Expired reports](${site}/reports/history): past reports with no confirmed cleanup`,
    `- [Sitemap](${site}/sitemap.xml): every public report page and its photos`,
    '',
    '## Community leaderboards',
    ...communities,
    `- [All leaderboards](${site}/communities): top litter reporters, cleaners and funders, and every town's page`,
    '',
    '## Help',
    `- [Help](${site}/help)`,
    `- [Get the app](${site}/get-app)`,
    `- [Privacy](${site}/privacy)`,
    `- [Terms](${site}/terms)`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' } });
}
