import { leaderboardTipLinks } from '@/lib/tips-server';
import { Website } from '@/components/public-website';
import { LeaderboardBoards } from '@/components/community-leaderboard/leaderboard-boards';
import { TownFinder, type FinderTown } from '@/components/community-leaderboard/town-finder';
import { TownSide } from '@/components/community-leaderboard/town-side';
import { LeaderboardTitle } from '@/components/community-leaderboard/leaderboard-title';
import styles from '@/components/community-leaderboard/leaderboard.module.css';
import { loadMyCommunities } from '@/lib/community-finder';
import { communityLabel, loadBoards, loadCommunityDirectory, monthInfo, townActivity } from '@/lib/community-leaderboards';
import { publicPageMetadata } from '@/lib/public-page-metadata';

export const dynamic = 'force-dynamic';
export const metadata = publicPageMetadata({
  title: 'Leaderboards: Top Litter Reporters, Cleaners & Funders | Litterbugs',
  description: 'See who is reporting litter, cleaning up and funding cleanups on Litterbugs this month, and find your town’s leaderboard.',
  alternates: { canonical: '/communities' },
});

export default async function LeaderboardsPage({ searchParams }: { searchParams: Promise<{ board?: string | string[]; period?: string | string[] }> }) {
  const query = await searchParams;
  const [boards, directory, yourTowns] = await Promise.all([loadBoards(null), loadCommunityDirectory(), loadMyCommunities()]);
  const month = monthInfo('America/New_York');
  const towns: FinderTown[] = directory.communities.map(community => ({
    path: community.path,
    name: community.name,
    label: communityLabel(community),
    place: [community.kind === 'county' && community.name !== community.areaName ? community.areaName : null,
      community.regionName, community.countryCode === 'US' ? null : community.countryName].filter(Boolean).join(', '),
    detail: townActivity(community),
    search: [community.name, community.areaName, community.regionName, community.regionCode?.split('-')[1], community.countryName]
      .filter(Boolean).join(' ').toLowerCase(),
    latitude: community.latitude,
    longitude: community.longitude,
  }));
  return <Website activePath="/communities" infoPage={false}>
    <div role="main" id="main-content" tabIndex={-1}>
      <LeaderboardBoards
        boards={boards}
        tipLinks={await leaderboardTipLinks([...boards.clean.all, ...boards.clean.month].map(row => row.profileId))}
        initial={{ board: typeof query.board === 'string' ? query.board : undefined, period: typeof query.period === 'string' ? query.period : undefined }}
        scope={{ kind: 'global' }}
        monthName={month.monthName}
        monthEnds={month.monthEnds}
        daysLeft={month.daysLeft}
        updatedAt={new Date().toISOString()}
        top={<header className={styles.top}><LeaderboardTitle>Global</LeaderboardTitle></header>}
        finder={directory.unavailable
          ? <p className={styles.finderMessage}>Towns couldn’t load right now. Please try again shortly.</p>
          : <TownFinder towns={towns} yourTowns={yourTowns} />}
        side={directory.communities.length ? <TownSide communities={directory.communities} /> : undefined}
      />
    </div>
  </Website>;
}
