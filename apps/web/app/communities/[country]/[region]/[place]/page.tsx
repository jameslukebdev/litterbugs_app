import { leaderboardTipLinks } from '@/lib/tips-server';
import { notFound } from 'next/navigation';
import { Website } from '@/components/public-website';
import { CommunityBreadcrumbs, GuideStructuredData } from '@/components/public-website/structured-data';
import { LeaderboardBoards } from '@/components/community-leaderboard/leaderboard-boards';
import { CommunityHelp } from '@/components/community-leaderboard/community-help';
import { TownMap } from '@/components/community-leaderboard/town-map';
import { LeaderboardTitle } from '@/components/community-leaderboard/leaderboard-title';
import styles from '@/components/community-leaderboard/leaderboard.module.css';
import { communityHelp } from '@/lib/community-help';
import { communityLabel, loadBoards, loadChampions, loadCommunity, monthInfo, placeTrail } from '@/lib/community-leaderboards';
import { communityMetaDescription } from '@/lib/community-metadata';
import { PlaceCrumbs } from '@/components/community-leaderboard/place-crumbs';
import { publicPageMetadata } from '@/lib/public-page-metadata';

type Props = { params: Promise<{ country: string; region: string; place: string }>; searchParams: Promise<{ board?: string | string[]; period?: string | string[] }> };

export const dynamic = 'force-dynamic';

const SEGMENT = /^[a-z0-9-]{1,80}$/;
async function communityFor(params: Props['params']) {
  const { country, region, place } = await params;
  if (![country, region, place].every(segment => SEGMENT.test(segment))) notFound();
  const community = await loadCommunity(`/communities/${country}/${region}/${place}`);
  if (!community) notFound();
  return community;
}

export async function generateMetadata({ params }: Props) {
  const community = await communityFor(params);
  const label = communityLabel(community);
  return publicPageMetadata({
    title: `${label} Litter Cleanups & Leaderboard | Litterbugs`,
    description: communityMetaDescription(community),
    // A new town is public from its first accepted report, but is offered to search engines only once it has substance.
    robots: { index: community.isIndexable, follow: true },
    alternates: { canonical: community.path },
  });
}

export default async function CommunityPage({ params, searchParams }: Props) {
  const community = await communityFor(params);
  const query = await searchParams;
  const label = communityLabel(community);
  const [boards, champions] = await Promise.all([loadBoards(community.slug), loadChampions(community.slug)]);
  const help = communityHelp(community.slug);
  const month = monthInfo(community.timeZone);
  const trail = placeTrail(community);
  return <Website activePath="/communities" infoPage={false}>
    <CommunityBreadcrumbs trail={[...trail, { name: label, path: community.path }]} />
    <GuideStructuredData questions={help.guide} />
    <div role="main" id="main-content" tabIndex={-1} data-community-slug={community.slug}>
      <LeaderboardBoards
        boards={boards}
        tipLinks={await leaderboardTipLinks([...boards.clean.all, ...boards.clean.month].map(row => row.profileId))}
        initial={{ board: typeof query.board === 'string' ? query.board : undefined, period: typeof query.period === 'string' ? query.period : undefined }}
        champions={champions}
        scope={{ kind: 'community', slug: community.slug, path: community.path, shortName: community.name }}
        monthName={month.monthName}
        monthEnds={month.monthEnds}
        daysLeft={month.daysLeft}
        updatedAt={new Date().toISOString()}
        top={<header className={styles.top}>
          <PlaceCrumbs steps={trail.slice(-1)} />
          <LeaderboardTitle>{label}</LeaderboardTitle>
        </header>}
        side={<TownMap slug={community.slug} latitude={community.latitude} longitude={community.longitude} label={community.name} />}
      >
        <CommunityHelp communitySlug={community.slug} cards={help.cards} guide={help.guide} reviewedAt={help.reviewedAt} />
      </LeaderboardBoards>
    </div>
  </Website>;
}
