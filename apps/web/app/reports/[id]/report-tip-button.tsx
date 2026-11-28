'use client';
/* eslint-disable @next/next/no-img-element -- small board bug artwork, as on the leaderboards. */

import Link from 'next/link';
import { useRef } from 'react';
import { FaHeart } from 'react-icons/fa6';
import { FiChevronRight, FiX } from 'react-icons/fi';
import { BOARD_COPY } from '@/components/community-leaderboard/ranks';
import styles from './report-tip-button.module.css';

export type ReportTipPerson = { id: string; name: string; role: 'cleaner' | 'reporter'; href: string };

const ROLE = {
  cleaner: { did: 'Cleaned it up', bug: BOARD_COPY.clean.bug },
  reporter: { did: 'Reported it', bug: BOARD_COPY.report.bug },
} as const;

/**
 * One "Leave a tip" button for a finished cleanup. With one person to thank it goes straight to their tip
 * page; with both a cleaner and a reporter it asks who, like a recipient picker.
 */
export function ReportTipButton({ people }: { people: readonly ReportTipPerson[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  if (!people.length) return null;
  const label = <><FaHeart aria-hidden="true" />Leave a tip</>;
  if (people.length === 1) {
    return <Link className={styles.button} href={people[0].href} prefetch={false} aria-label={`Leave a tip for ${people[0].name}`}>{label}</Link>;
  }
  return <>
    <button type="button" className={styles.button} aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>{label}</button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="report-tip-heading"
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className={styles.head}>
        <h2 id="report-tip-heading">Who would you like to tip?</h2>
        <button type="button" className={styles.close} aria-label="Close" onClick={() => dialog.current?.close()}><FiX aria-hidden="true" /></button>
      </div>
      <ul className={styles.people}>
        {people.map(person => <li key={person.id}>
          <Link className={styles.person} href={person.href} prefetch={false}>
            <img src={ROLE[person.role].bug} alt="" width={36} height={36} />
            <span><strong>{person.name}</strong><small>{ROLE[person.role].did}</small></span>
            <FiChevronRight aria-hidden="true" />
          </Link>
        </li>)}
      </ul>
    </dialog>
  </>;
}
