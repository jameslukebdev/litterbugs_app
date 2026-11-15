import { notFound } from 'next/navigation';
import { Website } from '@/components/public-website';
import { CommunityBreadcrumbs } from '@/components/public-website/structured-data';
import { PlaceCrumbs } from '@/components/community-leaderboard/place-crumbs';
import { TownList } from '@/components/community-leaderboard/town-list';
import styles from '@/components/community-leaderboard/leaderboard.module.css';
import { groupCommunities, loadCommunityDirectory, townActivity, townCount } from '@/lib/community-leaderboards';
import { publicPageMetadata } from '@/lib/public-page-metadata';

type Props = { params: Promise<{ country: string }> };

export const dynamic = 'force-dynamic';

/** A country with at least one public town, and its states. */
async function countryFor(params: Props['params']) {
  const { country } = await params;
  if (!/^[a-z]{2}$/.test(country)) notFound();
  const { communities } = await loadCommunityDirectory();
  const [group] = groupCommunities(communities.filter(community => community.path.startsWith(`/communities/${country}/`)), 'country');
  if (!group) notFound();
  return group;
}

export async function generateMetadata({ params }: Props) {
  const country = await countryFor(params);
  return publicPageMetadata({
    title: `${country.name} Litter Cleanup Leaderboards | Litterbugs`,
    description: `Find your town’s litter cleanup leaderboard in ${country.name}. ${townCount(country.towns.length)} on Litterbugs so far.`,
    robots: { index: country.isIndexable, follow: true },
    alternates: { canonical: country.path },
  });
}

export default async function CountryPage({ params }: Props) {
  const country = await countryFor(params);
  const regions = groupCommunities(country.towns, 'region');
  return <Website activePath="/communities" infoPage={false}>
    <CommunityBreadcrumbs trail={[{ name: country.name, path: country.path }]} />
    <div role="main" id="main-content" tabIndex={-1} className={`${styles.page} ${styles.browse}`}>
      <header className={styles.top}>
        <PlaceCrumbs steps={[]} />
        <h1>{country.name}</h1>
      </header>
      <TownList label={`Places in ${country.name}`} searchLabel={`Find a state in ${country.name}`} towns={regions.map(region => ({
        path: region.path,
        label: region.name,
        detail: region.towns.length === 1 ? `${region.towns[0].name}: ${townActivity(region.towns[0])}` : townCount(region.towns.length),
        search: [region.name, ...region.towns.map(town => town.name)].join(' ').toLowerCase(),
      }))} />
    </div>
  </Website>;
}
