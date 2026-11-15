/* eslint-disable @next/next/no-img-element -- small rank bugs, like the leaderboards. */
import Link from 'next/link';
import { ChampionBeetle } from '@/components/champion-beetle';
import { daysLeftLabel, rankFor } from '@/components/community-leaderboard/ranks';
import { communityLabel, loadBoards, loadCommunityDirectory, monthInfo, type CommunityRecord, type LeaderboardRow } from '@/lib/community-leaderboards';
import styles from './home-leaders.module.css';

const TOWNS = 5;
const PLAYERS = 3;
const count = (n: number, one: string, many: string) => <><b>{n}</b> {n === 1 ? one : many}</>;

/** Fewer towns than this with a cleanup this month, and the card shows all-time cleanups instead (as the boards do). */
const MONTH_MINIMUM = 3;

/** Towns ranked by cleanups only: this month's, or all-time when too few towns have one yet. Towns with none are left out. */
function topTowns(communities: CommunityRecord[]) {
  const ranked = (cleanups: (town: CommunityRecord) => number) => communities
    .filter(town => cleanups(town) > 0)
    .sort((a, b) => cleanups(b) - cleanups(a) || a.name.localeCompare(b.name))
    .slice(0, TOWNS)
    .map(town => ({ town, cleanups: cleanups(town) }));
  const month = ranked(town => town.monthCleanups);
  return month.length >= MONTH_MINIMUM ? { period: 'month' as const, rows: month } : { period: 'all' as const, rows: ranked(town => town.cleanups) };
}

/** Everyone on any all-time board, once each, most points first. Opted-out funders are already left out by the boards. */
function topPlayers(rows: LeaderboardRow[]) {
  const people = new Map<string, LeaderboardRow>();
  for (const row of rows) if (!people.has(row.profileId)) people.set(row.profileId, row);
  return [...people.values()].sort((a, b) => b.rankPoints - a.rankPoints || a.name.localeCompare(b.name)).slice(0, PLAYERS);
}

/** The homepage race: the busiest towns this month and the people with the most points. */
export async function HomeLeaders() {
  const [directory, boards] = await Promise.all([
    loadCommunityDirectory(),
    loadBoards(null).catch(() => null),
  ]);
  const { period, rows: towns } = topTowns(directory.communities);
  const players = boards ? topPlayers([...boards.clean.all, ...boards.report.all, ...boards.fund.all]).filter(row => row.rankPoints > 0) : [];
  if (!towns.length && !players.length) return null;
  const month = monthInfo('America/New_York');
  return (
    <section className={styles.leaders} aria-label="Leaderboards">
      {towns.length > 0 && <div className={styles.card}>
        <div className={styles.head}>
          <h2><ChampionBeetle className={styles.beetle} />Top towns</h2>
          <span className={styles.pill}>{period === 'month' ? `${month.monthName} · ${daysLeftLabel(month.daysLeft)}` : 'All time'}</span>
        </div>
        <ol className={styles.list}>
          {towns.map(({ town, cleanups }, index) => <li key={town.path}>
            <Link href={town.path} className={styles.row}>
              <span className={styles.medal} data-medal={index < 3 ? index + 1 : undefined}>{index + 1}</span>
              <strong className={styles.name}>{communityLabel(town)}</strong>
              <span className={styles.score}>{count(cleanups, 'cleanup', 'cleanups')}</span>
            </Link>
          </li>)}
        </ol>
      </div>}
      {players.length > 0 && <div className={styles.card}>
        <div className={styles.head}><h2>Cleanup leaderboard</h2></div>
        <ol className={styles.list}>
          {players.map((player, index) => <li key={player.profileId} className={styles.row}>
            <span className={styles.medal} data-medal={index + 1}>{index + 1}</span>
            <img className={styles.bug} src={rankFor(player.rankPoints).artwork} alt="" width={34} height={34} />
            <span className={styles.who}><strong>{player.name}</strong>{player.communityName && <span>{player.communityName}</span>}</span>
            <span className={styles.score}>{count(player.rankPoints, 'point', 'points')}</span>
          </li>)}
        </ol>
        <Link className={styles.more} href="/communities">See all leaderboards</Link>
      </div>}
    </section>
  );
}
