import Link from 'next/link';
import { FiChevronRight } from 'react-icons/fi';
import styles from './leaderboard.module.css';

/** The visible way back up: Leaderboards, then each place above this page. */
export function PlaceCrumbs({ steps }: { steps: { name: string; path: string }[] }) {
  const all = [{ name: 'Leaderboards', path: '/communities' }, ...steps];
  return <nav className={styles.crumbs} aria-label="Breadcrumb">
    {all.map((step, index) => <span key={step.path}>
      {index > 0 && <FiChevronRight aria-hidden="true" />}
      <Link href={step.path}>{step.name}</Link>
    </span>)}
  </nav>;
}
