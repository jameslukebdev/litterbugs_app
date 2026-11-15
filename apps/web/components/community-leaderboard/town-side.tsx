import Link from 'next/link';
import { FiChevronRight } from 'react-icons/fi';
import { byActivity, communityLabel, groupCommunities, townActivity, townCount, type CommunityRecord } from '@/lib/community-leaderboards';
import styles from './leaderboard.module.css';

const BUSIEST = 5;

/** Beside the global board: the busiest towns, then every country with towns, each opening its own list. */
export function TownSide({ communities }: { communities: CommunityRecord[] }) {
  if (!communities.length) return null;
  const busiest = [...communities].sort(byActivity).slice(0, BUSIEST);
  const countries = groupCommunities(communities, 'country');
  return <>
    <section className={styles.sideCard} aria-labelledby="busiest-title">
      <h2 id="busiest-title">Busiest towns</h2>
      <ol className={styles.sideList}>
        {busiest.map(town => <li key={town.path}><Link href={town.path}>
          <span><strong>{communityLabel(town)}</strong><span>{townActivity(town)}</span></span>
          <FiChevronRight aria-hidden="true" />
        </Link></li>)}
      </ol>
    </section>
    <nav className={styles.sideCard} aria-labelledby="browse-title">
      <h2 id="browse-title">Browse all towns</h2>
      <ul className={styles.sideList}>
        {countries.map(country => <li key={country.path}><Link href={country.path}>
          <span><strong>{country.name}</strong><span>{townCount(country.towns.length)}</span></span>
          <FiChevronRight aria-hidden="true" />
        </Link></li>)}
      </ul>
    </nav>
  </>;
}
