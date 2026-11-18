'use client';
/* eslint-disable @next/next/no-img-element -- small bug artwork, like the boards. */
import Link from 'next/link';
import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AVAILABLE_CLEANUPS_MAP_HREF, REPORT_ENTRY_HREF } from '@/lib/home-map-link';
import { buildRankPath, type PathStone, type RankPointEvent } from '@/lib/rank-path';
import styles from './rank-path.module.css';

/** Each route's bug: Report = dragonfly, Clean = butterfly, Fund = bee (as everywhere on the site). */
const BUG = { report: '/brand/ranks/dragonfly.svg', clean: '/brand/bugs/butterfly.png', fund: '/brand/bugs/bee.png' } as const;
const SWAY = [0, -40, -64, -40, 0, 40, 64, 40];

const pointsLabel = (count: number) => `${count} ${count === 1 ? 'point' : 'points'}`;
const shortDate = (iso: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso));
const eventName = (kind: 'report' | 'clean') => (kind === 'clean' ? 'Cleanup confirmed' : 'Report accepted');

type Rpc = (name: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
type EventRow = { kind: string; points: number; earned_at: string };

/** The signed-in member's path to their next rank bug. Shows nothing until their points load, or if they can't. */
export function RankPath({ userId }: { userId: string }) {
  const [events, setEvents] = useState<RankPointEvent[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    // The generated database types predate this function; rows are checked by shape below.
    const client = createClient() as unknown as { rpc: Rpc };
    void Promise.resolve(client.rpc('my_rank_point_events')).then(({ data, error }) => {
      if (cancelled || error || !Array.isArray(data)) return;
      setEvents((data as EventRow[]).map(row => ({ kind: row.kind === 'clean' ? 'clean' : 'report', points: Number(row.points) || 0, earnedAt: row.earned_at })));
    }, () => undefined);
    return () => { cancelled = true; };
  }, [userId]);
  return events ? <RankPathView events={events} /> : null;
}

/** The path itself: one stepping stone per point from your bug to the next, joined by a faint winding line. */
export function RankPathView({ events }: { events: RankPointEvent[] }) {
  const path = buildRankPath(events);
  const { rank, next, total, toGo, stones, folded } = path;
  const [openPoint, setOpenPoint] = useState<number | null>(null);
  const panelId = useId();
  const stops: (PathStone | 'more' | 'goal')[] = [...stones];
  if (folded) stops.push('more');
  if (next) stops.push('goal');

  return (
    <section className={styles.card} aria-label="Your path to the next rank">
      <div className={styles.head}>
        <img src={rank.artwork} alt="" />
        <span>
          <strong>{rank.name}</strong>
          <span>{pointsLabel(total)}{next ? ` · ${pointsLabel(toGo)} to ${next.name}` : ' · Highest rank reached'}</span>
        </span>
      </div>

      {next && <ol className={styles.path}>
        {stops.map((stop, index) => {
          const x = SWAY[index % SWAY.length];
          const nextX = SWAY[(index + 1) % SWAY.length];
          const side = x > 0 ? 'left' : 'right';
          const shown = typeof stop !== 'string' && stop.point === openPoint;
          let row: ReactNode;
          let details: ReactNode;

          if (stop === 'more') {
            row = <span className={styles.more}>+{folded} more stones</span>;
          } else if (stop === 'goal') {
            row = <>
              <span className={styles.goal}><img src={next.artwork} alt="" /></span>
              <span className={styles.label}><strong>{next.name}</strong><span>{pointsLabel(toGo)} to go</span></span>
            </>;
          } else if (stop.state === 'empty') {
            row = <span className={styles.stone} data-state="empty" aria-label={`Point ${stop.point + 1}: not earned yet`} />;
          } else if (stop.state === 'next') {
            row = <>
              <button type="button" className={styles.stone} data-state="next" aria-expanded={shown} aria-controls={shown ? panelId : undefined} aria-label={`Point ${stop.point + 1}: ways to earn it`} onClick={() => setOpenPoint(shown ? null : stop.point)}><b>+1</b></button>
              <span className={styles.label}><strong>{total === 0 ? 'Your first point' : 'Next point'}</strong></span>
            </>;
            details = <div id={panelId} className={styles.pop} role="group" aria-label="Ways to earn your next point">
              <Link href={REPORT_ENTRY_HREF} data-tone="report"><img src={BUG.report} alt="" /><span><strong>Report litter</strong><span>+1 point when it’s accepted</span></span></Link>
              <Link href={AVAILABLE_CLEANUPS_MAP_HREF} data-tone="earn"><img src={BUG.clean} alt="" /><span><strong>Clean a spot</strong><span>+3 points when it’s confirmed</span></span></Link>
              <Link href={AVAILABLE_CLEANUPS_MAP_HREF} data-tone="donate"><img src={BUG.fund} alt="" /><span><strong>Fund a cleanup</strong><span>No points · counts on the Funders board</span></span></Link>
            </div>;
          } else if (stop.state === 'earned') {
            const date = shortDate(stop.earnedAt);
            const label = eventName(stop.kind);
            row = <>
              <button type="button" className={styles.stone} data-state={stop.kind} aria-expanded={shown} aria-controls={shown ? panelId : undefined} aria-label={`Point ${stop.point + 1}: ${label}, ${date}`} onClick={() => setOpenPoint(shown ? null : stop.point)}>
                <img src={BUG[stop.kind]} alt="" />
              </button>
              {stop.first && <span className={styles.label}><strong>{label}</strong><span>{date} · +{stop.points}</span></span>}
            </>;
            details = <div id={panelId} className={styles.pop} role="group" aria-label={label}>
              <p className={styles.note}><strong>{label} · {date}</strong>{stop.kind === 'clean' ? 'A confirmed cleanup fills three stones.' : 'An accepted report fills one stone.'}</p>
            </div>;
          }

          return <li key={typeof stop === 'string' ? stop : stop.point} className={styles.stop} data-side={side} data-more={stop === 'more' || undefined} data-before-more={stops[index + 1] === 'more' || undefined} style={{ '--x': `${x}px` } as CSSProperties}>
            {index < stops.length - 1 && <svg className={styles.line} viewBox="-120 0 240 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <path d={`M ${x} 0 C ${x} 50, ${nextX} 50, ${nextX} 100`} vectorEffect="non-scaling-stroke" />
            </svg>}
            <div className={styles.row}>{row}</div>
            {shown && details}
          </li>;
        })}
      </ol>}
    </section>
  );
}
