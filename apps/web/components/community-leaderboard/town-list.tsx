'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FiChevronRight, FiSearch } from 'react-icons/fi';
import styles from './leaderboard.module.css';

export type TownSummary = { path: string; label: string; detail: string; search: string };

/** A list of towns (or states), most active first, with a quick filter once it is longer than six. */
export function TownList({ towns, unavailable = false, label, searchLabel = 'Find your town' }: {
  towns: TownSummary[]; unavailable?: boolean; label: string; searchLabel?: string;
}) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const shown = needle ? towns.filter(town => town.search.includes(needle)) : towns;
  return <section className={styles.towns} aria-label={label}>
    {towns.length > 6 && <label className={styles.townSearch}>
      <FiSearch aria-hidden="true" />
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={searchLabel} aria-label={searchLabel} />
    </label>}
    {unavailable ? <p className={styles.townsEmpty}>Towns couldn’t load right now. Please try again shortly.</p>
      : shown.length ? <ul className={styles.townList}>
        {shown.map(town => <li key={town.path}><Link href={town.path}>
          <strong>{town.label}</strong><span>{town.detail}</span><FiChevronRight aria-hidden="true" />
        </Link></li>)}
      </ul>
      : <p className={styles.townsEmpty}>{needle ? `Nothing matches “${query.trim()}” yet. A town gets its own page with its first report.` : 'No towns yet.'}</p>}
  </section>;
}
