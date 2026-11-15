import { notFound } from 'next/navigation';
import { Website } from '@/components/public-website';
import { CommunityBreadcrumbs } from '@/components/public-website/structured-data';
import { PlaceCrumbs } from '@/components/community-leaderboard/place-crumbs';
import { TownList } from '@/components/community-leaderboard/town-list';
import { LeaderboardTitle } from '@/components/community-leaderboard/leaderboard-title';
import styles from '@/components/community-leaderboard/leaderboard.module.css';
import { groupCommunities, loadCommunityDirectory, placeTrail, townActivity } from '@/lib/community-leaderboards';
import { publicPageMetadata } from '@/lib/public-page-metadata';

type Props = { params: Promise<{ country: string; region: string }> };

export const dynamic = 'force-dynamic';

const SEGMENT = /^[a-z0-9-]{1,80}$/;

/** A state (or a country's other places) with at least one public town. */
async function regionFor(params: Props['params']) {
  const { country, region } = await params;
  if (!/^[a-z]{2}$/.test(country) || !SEGMENT.test(region)) notFound();
  const { communities } = await loadCommunityDirectory();
  const [group] = groupCommunities(communities.filter(community => community.path.startsWith(`/communities/${country}/${region}/`)), 'region');
  if (!group) notFound();
  return group;
}

export async function generateMetadata({ params }: Props) {
  const region = await regionFor(params);
  const where = region.name === region.countryName ? region.name : `${region.name}, ${region.countryName}`;
  return publicPageMetadata({
    title: `${region.name} Litter Cleanup Leaderboards | Litterbugs`,
    description: `Find your town’s litter cleanup leaderboard in ${where}: ${region.towns.slice(0, 3).map(town => town.name).join(', ')}${region.towns.length > 3 ? ' and more' : ''}.`,
    robots: { index: region.isIndexable, follow: true },
    alternates: { canonical: region.path },
  });
}

export default async function RegionPage({ params }: Props) {
  const region = await regionFor(params);
  const trail = placeTrail(region.towns[0]);
  const fullTrail = trail.some(step => step.path === region.path) ? trail : [...trail, { name: region.name, path: region.path }];
  return <Website activePath="/communities" infoPage={false}>
    <CommunityBreadcrumbs trail={fullTrail} />
    <div role="main" id="main-content" tabIndex={-1} className={`${styles.page} ${styles.browse}`}>
      <header className={styles.top}>
        <PlaceCrumbs steps={trail.slice(0, 1)} />
        <LeaderboardTitle>{region.name}</LeaderboardTitle>
      </header>
      <TownList label={`Towns in ${region.name}`} searchLabel={`Find a town in ${region.name}`} towns={region.towns.map(town => ({
        path: town.path,
        label: town.name,
        detail: townActivity(town),
        search: [town.name, town.areaName].join(' ').toLowerCase(),
      }))} />
    </div>
  </Website>;
}
