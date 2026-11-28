import Link from 'next/link';
import { FaHeart } from 'react-icons/fa6';
import styles from './leaderboard-tip-action.module.css';

/** A small heart pill beside a cleaner's score: easy to find, quieter than the score itself. */
export function LeaderboardTipAction({ name, href }: { name: string; href: string }) {
  return <Link className={styles.tip} href={href} aria-label={`Tip ${name}`}>
    <FaHeart aria-hidden="true" />Tip
  </Link>;
}
