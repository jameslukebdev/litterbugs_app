import type { ReactNode } from 'react';
import { ChampionBeetle } from '@/components/champion-beetle';
import styles from './leaderboard.module.css';

/** A leaderboards page title, led by the Leaderboards bug: the crowned beetle, which does its victory hop as the page opens. */
export function LeaderboardTitle({ children }: { children: ReactNode }) {
  return <h1 className={styles.title}><ChampionBeetle arrive className={styles.titleBeetle} /><span>{children}</span></h1>;
}
