import { useId } from 'react';
import styles from './champion-beetle.module.css';

const PURPLE = '#5f4ff0';
const GOLD = '#ffbf1f';

/**
 * Leaderboards' bug: the crowned beetle, drawn like the other brand bugs (one flat colour, rounded, details cut
 * out as gaps, tilted) with a gold crown floating above its head. Inside a link or button it does a victory hop
 * on hover or keyboard focus: it springs up, the crown flips and lands, two sparkles flash.
 * Same drawing as /brand/bugs/champion-beetle.svg, inline so the crown and sparkles can move on their own.
 */
export function ChampionBeetle({ className = '' }: { className?: string }) {
  const cut = `beetle-cut-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  return <svg className={`${styles.beetle} ${className}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <defs>
      <mask id={cut} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
        <rect width="100" height="100" fill="#fff" />
        <circle cx="50" cy="27" r="15.2" fill="none" stroke="#000" strokeWidth="3.6" />
        <path d="M50 46v46" stroke="#000" strokeWidth="4" strokeLinecap="round" />
        <path d="M24 45q26 9 52 0" fill="none" stroke="#000" strokeWidth="3.6" strokeLinecap="round" />
      </mask>
    </defs>
    <g transform="rotate(-20 50 55)">
      <g className={styles.body}>
        <g mask={`url(#${cut})`} fill={PURPLE}>
          <ellipse cx="50" cy="62" rx="28" ry="29" />
          <circle cx="50" cy="27" r="12.8" />
        </g>
        <path d="M40 19q-8-6-14-4M60 19q8-6 14-4" fill="none" stroke={PURPLE} strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="25" cy="15" r="4.6" fill={PURPLE} />
        <circle cx="75" cy="15" r="4.6" fill={PURPLE} />
      </g>
      <path className={styles.crown} d="M38.5 12L36.5 1l7.5 5.5L50 -1.5l6 8 7.5-5.5-2 11z" fill={GOLD} stroke={GOLD} strokeWidth="2.4" strokeLinejoin="round" />
      <path className={styles.sparkle} d="M24 -2l1.8 3.7 3.7 1.8-3.7 1.8L24 9l-1.8-3.7-3.7-1.8 3.7-1.8z" fill={GOLD} />
      <path className={styles.sparkle} d="M77 -6l1.5 3 3 1.5-3 1.5L77 3l-1.5-3-3-1.5 3-1.5z" fill={GOLD} />
    </g>
  </svg>;
}
