'use client';
/* eslint-disable @next/next/no-img-element -- small bug artwork, like the boards. */
import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AVAILABLE_CLEANUPS_MAP_HREF, REPORT_ENTRY_HREF } from '@/lib/home-map-link';
import { buildRankPath, type RankPointEvent } from '@/lib/rank-path';
import styles from './rank-path.module.css';

/** Each route's bug: Report = dragonfly, Clean = butterfly, Fund = bee (as everywhere on the site). */
const BUG = { report: '/brand/ranks/dragonfly.svg', clean: '/brand/bugs/butterfly.png', fund: '/brand/bugs/bee.png' } as const;
const SWAY = [0, -40, -64, -40, 0, 40, 64, 40];
const ROW = 92;
const MORE_ROW = ROW * .75;
/** Room the line leaves under an open stone for what it shows. */
const ROOM = { next: 250, note: 112 } as const;

const pointsLabel = (count: number) => `${count} ${count === 1 ? 'point' : 'points'}`;
const shortDate = (iso: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso));
const eventName = (kind: 'report' | 'clean') => (kind === 'clean' ? 'Cleanup confirmed' : 'Report accepted');

function linePath(stops: { x: number; y: number }[]) {
  return stops.map((stop, index) => {
    if (index === 0) return `M ${stop.x} ${stop.y}`;
    const before = stops[index - 1];
    const middle = (before.y + stop.y) / 2;
    return `C ${before.x} ${middle}, ${stop.x} ${middle}, ${stop.x} ${stop.y}`;
  }).join(' ');
}

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
  const nextPoint = stones.find(stone => stone.state === 'next')?.point ?? null;
  /** The stone whose details show under it; the next stone starts open so the ways to earn are in view. */
  const [open, setOpen] = useState<number | 'next' | null>('next');
  const openPoint = open === 'next' ? nextPoint : open;

  type Stop = { kind: 'stone'; index: number } | { kind: 'more' } | { kind: 'goal' };
  const stops: Stop[] = [...stones.map((_, index) => ({ kind: 'stone' as const, index })), ...(folded ? [{ kind: 'more' as const }] : []), ...(next ? [{ kind: 'goal' as const }] : [])];
  let y = 0;
  const placed = stops.map((stop, index) => {
    const at = { stop, x: SWAY[index % SWAY.length], y };
    y += stop.kind === 'more' ? MORE_ROW : ROW;
    const point = stop.kind === 'stone' ? stones[stop.index].point : null;
    if (point !== null && point === openPoint) y += point === nextPoint ? ROOM.next : ROOM.note;
    return at;
  });

  return (
    <section className={styles.card} aria-label="Your path to the next rank">
      <div className={styles.head}>
        <img src={rank.artwork} alt="" />
        <span>
          <strong>{rank.name}</strong>
          <span>{pointsLabel(total)}{next ? ` · ${pointsLabel(toGo)} to ${next.name}` : ' · Highest rank reached'}</span>
        </span>
      </div>

      {next && <ol className={styles.path} style={{ height: y }}>
        <svg className={styles.line} viewBox={`-120 0 240 ${y}`} width={240} height={y} aria-hidden="true" focusable="false">
          <path d={linePath(placed.map(({ x, y: top, stop }) => ({ x, y: top + (stop.kind === 'more' ? MORE_ROW / 2 : ROW / 2) })))} />
        </svg>
        {placed.map(({ stop, x, y: top }) => {
          const side = x > 0 ? 'left' : 'right';
          const place = { '--x': `${x}px`, top } as CSSProperties;
          if (stop.kind === 'more') return <li key="more" className={styles.stop} data-more="" style={place}>
            <span className={styles.more}>+{folded} more stones</span>
          </li>;
          if (stop.kind === 'goal') return <li key="goal" className={styles.stop} style={place} data-side={side}>
            <span className={styles.goal}><img src={next.artwork} alt="" /></span>
            <span className={styles.label}><strong>{next.name}</strong><span>{pointsLabel(toGo)} to go</span></span>
          </li>;
          const stone = stones[stop.index];
          const shown = stone.point === openPoint;
          if (stone.state === 'empty') return <li key={stone.point} className={styles.stop} style={place} data-side={side}>
            <span className={styles.stone} data-state="empty" aria-label={`Point ${stone.point + 1}: not earned yet`} />
          </li>;
          if (stone.state === 'next') return <li key={stone.point} className={styles.stop} style={place} data-side={side} data-open={shown}>
            <button type="button" className={styles.stone} data-state="next" aria-expanded={shown} aria-label={`Point ${stone.point + 1}: ways to earn it`} onClick={() => setOpen(shown ? null : stone.point)}><b>+1</b></button>
            <span className={styles.label}><strong>{total === 0 ? 'Your first point' : 'Next point'}</strong></span>
            {shown && <div className={styles.pop} role="group" aria-label="Ways to earn your next point">
              <Link href={REPORT_ENTRY_HREF} data-tone="report"><img src={BUG.report} alt="" /><span><strong>Report litter</strong><span>+1 point when it’s accepted</span></span></Link>
              <Link href={AVAILABLE_CLEANUPS_MAP_HREF} data-tone="earn"><img src={BUG.clean} alt="" /><span><strong>Clean a spot</strong><span>+3 points when it’s confirmed</span></span></Link>
              <Link href={AVAILABLE_CLEANUPS_MAP_HREF} data-tone="donate"><img src={BUG.fund} alt="" /><span><strong>Fund a cleanup</strong><span>No points · counts on the Funders board</span></span></Link>
            </div>}
          </li>;
          if (stone.state !== 'earned') return null;
          const date = shortDate(stone.earnedAt);
          return <li key={stone.point} className={styles.stop} style={place} data-side={side} data-open={shown}>
            <button type="button" className={styles.stone} data-state={stone.kind} aria-expanded={shown} aria-label={`Point ${stone.point + 1}: ${eventName(stone.kind)}, ${date}`} onClick={() => setOpen(shown ? null : stone.point)}>
              <img src={BUG[stone.kind]} alt="" />
            </button>
            {stone.first && <span className={styles.label}><strong>{eventName(stone.kind)}</strong><span>{date} · +{stone.points}</span></span>}
            {shown && <div className={styles.pop} role="group" aria-label={eventName(stone.kind)}>
              <p className={styles.note}><strong>{eventName(stone.kind)} · {date}</strong>{stone.kind === 'clean' ? 'A confirmed cleanup fills three stones.' : 'An accepted report fills one stone.'}</p>
            </div>}
          </li>;
        })}
      </ol>}
    </section>
  );
}
