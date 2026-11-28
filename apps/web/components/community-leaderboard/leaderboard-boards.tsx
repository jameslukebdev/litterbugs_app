'use client';
/* eslint-disable @next/next/no-img-element -- bugs label boards and ranks, like the map. */
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { getHeaderProfile, getServerHeaderProfile, subscribeHeaderProfile } from '@/lib/header-profile-cache';
import type { Board, Boards, Champion, LeaderboardRow, Period } from '@/lib/community-leaderboards';
import { BOARD_COPY, daysLeftLabel, ordinal, rankFor } from './ranks';
import { RankPath } from './rank-path';
import { LeaderboardTipAction } from '@/components/leaderboard-tip-action';
import styles from './leaderboard.module.css';

const BOARDS: Board[] = ['clean', 'report', 'fund'];
/** Boards keep readable names in the address bar, so a shared link opens the same board. */
const SLUG: Record<Board, string> = { clean: 'cleaners', report: 'reporters', fund: 'funders' };
/** A month board with fewer people than this opens on All time instead. */
const FULL_MONTH = 3;
const VISIBLE = 10;

export type LeaderboardScope =
  | { kind: 'community'; slug: string; path: string; shortName: string }
  | { kind: 'global' };

/** The month board unless it has fewer than three people; then All time, which is never emptier. */
function defaultPeriod(boards: Boards, board: Board): Period {
  return boards[board].month.length >= FULL_MONTH ? 'month' : 'all';
}
/** The first board with anyone on it, so a new town doesn't open on an empty Cleaners board. */
function defaultBoard(boards: Boards): Board {
  return BOARDS.find(board => boards[board].all.length > 0) ?? 'clean';
}

function relativeTime(iso: string, now: number) {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  if (minutes < 2) return 'Updated just now';
  if (minutes < 60) return `Updated ${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  return `Updated ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
}

export function LeaderboardBoards({ boards, scope, monthName, monthEnds, daysLeft, updatedAt, champions, top, finder, side, children, initial, tipLinks }: {
  boards: Boards;
  tipLinks?: Readonly<Record<string, string>>;
  /** Board and period from the address (?board=reporters&period=all), so the right board shows before scripts load. */
  initial?: { board?: string; period?: string };
  scope: LeaderboardScope;
  monthName: string;
  /** "November 30" */
  monthEnds: string;
  daysLeft: number;
  updatedAt: string;
  champions?: Record<Board, Champion[]>;
  /** The page top (breadcrumb and title), inside the page so it shares the board colours. */
  top?: ReactNode;
  /** The town finder: first in the side column on wide screens, between the title and the board on phones. */
  finder?: ReactNode;
  /** Server-rendered extras for the side column, such as the town map. */
  side?: ReactNode;
  /** Sections below the board (local help), rendered inside the page so they share its colours. */
  children?: ReactNode;
}) {
  const startBoard = BOARDS.find(key => SLUG[key] === initial?.board) ?? defaultBoard(boards);
  const [board, setBoard] = useState<Board>(startBoard);
  const [period, setPeriod] = useState<Period>(initial?.period === 'all' || initial?.period === 'month' ? initial.period : defaultPeriod(boards, startBoard));
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.parse(updatedAt));
  const [addressRead, setAddressRead] = useState(false);
  const member = useSyncExternalStore(subscribeHeaderProfile, getHeaderProfile, getServerHeaderProfile);
  const shareDialog = useRef<HTMLDialogElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /* The server already chose the board from the address; from here on, keep the address in step. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start syncing the address after hydration.
    setAddressRead(true);
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, [boards]);
  useEffect(() => {
    if (!addressRead) return;
    const query = new URLSearchParams(window.location.search);
    query.set('board', SLUG[board]);
    query.set('period', period);
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${query}`);
  }, [addressRead, board, period]);

  const chooseBoard = (next: Board) => { setBoard(next); setPeriod(defaultPeriod(boards, next)); setShowAll(false); };
  const choosePeriod = (next: Period) => { setPeriod(next); setShowAll(false); };
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + BOARDS.length) % BOARDS.length;
    chooseBoard(BOARDS[next]);
    tabRefs.current[next]?.focus();
  };

  const copy = BOARD_COPY[board];
  const unit = (n: number) => (n === 1 ? copy.one : copy.many);
  const rows = boards[board][period];
  const visible = showAll ? rows : rows.slice(0, VISIBLE);
  const where = scope.kind === 'community' ? scope.shortName : 'Litterbugs';
  const raceName = period === 'month' ? `${monthName} ${copy.tab.toLowerCase()} race` : `all-time ${copy.tab.toLowerCase()} board`;

  /* Your standing comes from the same rows everyone sees. */
  const me = member?.userId ? rows.find(row => row.profileId === member.userId) : undefined;
  const ahead = me ? [...rows].reverse().find(row => row.score > me.score) : undefined;
  const aheadNames = ahead ? rows.filter(row => row.score === ahead.score).map(row => row.name) : [];
  const gap = me && ahead ? ahead.score - me.score : 0;
  const nextStep = !me ? '' : !ahead
    ? 'You’re in first place.'
    : `${gap} more ${gap === 1 ? copy.one : copy.many} ${gap === 1 ? 'ties' : 'tie'} ${aheadNames.slice(0, 2).join(' and ')}${aheadNames.length > 2 ? ' and others' : ''} for ${ordinal(ahead.place)}.`;
  const shareQuery = me ? new URLSearchParams({ board, period, profile: me.profileId, ...(scope.kind === 'community' ? { community: scope.slug } : {}) }) : null;
  const pagePath = scope.kind === 'community' ? scope.path : '/communities';
  const signInHref = `/sign-in?next=${encodeURIComponent(`${pagePath}?board=${SLUG[board]}`)}`;

  const list = champions?.[board] ?? [];
  const [latest, ...earlier] = list;
  const monthOf = (month: string) => new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' }).format(new Date(`${month}T00:00:00Z`));
  const hasSide = Boolean(side) || list.length > 0;

  return <div className={styles.page} data-board={board}>
    {top}
    <div className={styles.layout} data-single={hasSide || finder ? undefined : ''} data-finder={finder ? '' : undefined}>
      {finder && <div className={styles.finderArea}>{finder}</div>}
      <div className={styles.main}>
        <section className={styles.race} aria-labelledby="race-title">
          <div className={styles.badges} role="tablist" aria-label="Leaderboard">
            {BOARDS.map((key, index) => <button key={key} ref={element => { tabRefs.current[index] = element; }} id={`tab-${key}`} type="button" role="tab"
              aria-selected={board === key} aria-controls="board-panel" tabIndex={board === key ? 0 : -1}
              onClick={() => chooseBoard(key)} onKeyDown={event => onTabKey(event, index)}>
              <span className={styles.badge}><img src={BOARD_COPY[key].bug} alt="" /></span>
              {BOARD_COPY[key].tab}
            </button>)}
          </div>
          <div className={styles.raceHead}>
            <h2 id="race-title">{period === 'month' ? `${monthName} race` : 'All-time race'}</h2>
            {period === 'month' && <span className={styles.daysLeft} title={`Ends ${monthEnds}`}>{daysLeftLabel(daysLeft)}</span>}
            <div className={styles.period} role="group" aria-label="Time period">
              <button type="button" aria-pressed={period === 'month'} onClick={() => choosePeriod('month')}>This month</button>
              <button type="button" aria-pressed={period === 'all'} onClick={() => choosePeriod('all')}>All time</button>
            </div>
          </div>

          <ol className={styles.lanes} key={`${board}-${period}`} id="board-panel" role="tabpanel" aria-labelledby={`tab-${board}`}>
            {visible.map(row => {
              // Cleaners and reporters can be tipped; funders give money, so their board has no Tip.
              const tipHref = board === 'fund' ? undefined : tipLinks?.[row.profileId];
              const reviewHref = tipHref?.startsWith('/tip/')
                ? `${tipHref}?${new URLSearchParams({ role: board === 'report' ? 'reporter' : 'cleaner', back: pagePath, ...(row.communityName ? { town: row.communityName } : {}) })}`
                : tipHref;
              return <BoardRow key={row.profileId} row={row} unit={unit} scope={scope} tipHref={reviewHref} />;
            })}
            {!rows.length && <li className={styles.emptyLane}>{copy.none} {scope.kind === 'community' ? `in ${where} ` : ''}yet{period === 'month' ? ' this month' : ''}.</li>}
          </ol>
          {rows.length > VISIBLE && <button type="button" className={styles.showAll} aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
            {showAll ? `Show top ${VISIBLE}` : `Show all ${rows.length} ${copy.tab.toLowerCase()}`}
          </button>}
          {rows.length > 0 && <p className={styles.updated}>{relativeTime(updatedAt, now)}</p>}
        </section>

        <section className={styles.standing} aria-label="Your standing">
          {me ? <>
            <span className={styles.standingBug}><img src={rankFor(me.rankPoints).artwork} alt="" /></span>
            <div className={styles.standingCopy}>
              <h2>You’re {ordinal(me.place)} {scope.kind === 'community' ? `in ${where}` : 'on Litterbugs'}</h2>
              <p>{me.score} {unit(me.score)} in the {raceName}. {nextStep}</p>
            </div>
            <button type="button" className={styles.primary} onClick={() => { setCopied(false); shareDialog.current?.showModal(); }}>Share my rank</button>
          </> : member?.userId ? <>
            <span className={styles.standingBug} data-empty><img src={copy.bug} alt="" /></span>
            <div className={styles.standingCopy}>
              <h2>You’re not on this board yet</h2>
              <p>{copy.join}{scope.kind === 'community' ? ` in ${where}` : ''} to join the {raceName}.</p>
            </div>
          </> : <>
            <span className={styles.standingBug} data-empty><img src={copy.bug} alt="" /></span>
            <div className={styles.standingCopy}>
              <h2>See where you stand</h2>
              <p>Sign in to find your place on the {scope.kind === 'community' ? `${where} ` : ''}boards.</p>
            </div>
            <Link className={styles.secondary} href={signInHref}>Sign in</Link>
          </>}
        </section>
        {/* Signed-in members see their own path to the next rank bug right under where they stand. */}
        {member?.userId && <RankPath userId={member.userId} />}
      </div>

      {hasSide && <aside className={styles.side} aria-label={scope.kind === 'community' ? `${where} map and champions` : 'Towns'}>
        {side}
        {latest && <Link className={styles.latest} href={`/members/${latest.profileId}`}>
          <span className={styles.latestBadge}><img src={rankFor(latest.rankPoints).artwork} alt="" /></span>
          <p className={styles.latestTitle}>{monthOf(latest.month)} {copy.title}</p>
          <strong>{latest.name}</strong>
          <span>{latest.score} {unit(latest.score)}</span>
        </Link>}
        {earlier.length > 0 && <ul className={styles.champs} aria-label="Earlier champions">
          {earlier.map(champion => <li key={champion.month}><Link href={`/members/${champion.profileId}`}>
            <img src={rankFor(champion.rankPoints).artwork} alt="" />
            <span><strong>{champion.name}</strong><span>{monthOf(champion.month)} champion</span></span>
          </Link></li>)}
        </ul>}
      </aside>}
    </div>

    {children}

    <dialog ref={shareDialog} className={styles.share} aria-labelledby="share-title"
      onClick={event => { if (event.target === event.currentTarget) shareDialog.current?.close(); }}>
      {me && shareQuery && <>
        <div className={styles.shareHead}>
          <h2 id="share-title">Share my rank</h2>
          <button type="button" className={styles.close} aria-label="Close" onClick={() => shareDialog.current?.close()}>×</button>
        </div>
        <img className={styles.cardImage} src={`/communities/rank-card?${shareQuery}`} alt={`${ordinal(me.place)} ${scope.kind === 'community' ? `in ${where}` : 'on Litterbugs'}, ${me.score} ${unit(me.score)}`} width={1200} height={630} />
        <div className={styles.shareActions}>
          <button type="button" className={styles.primary} aria-live="polite" onClick={() => {
            void navigator.clipboard?.writeText(`${window.location.origin}${pagePath}?board=${SLUG[board]}`).then(() => setCopied(true));
          }}>{copied ? 'Link copied' : 'Copy link'}</button>
          <a className={styles.secondary} href={`/communities/rank-card?${shareQuery}&download=1`} download="litterbugs-rank.png">Save image</a>
        </div>
      </>}
    </dialog>
  </div>;
}

function BoardRow({ row, unit, scope, tipHref }: {
  row: LeaderboardRow; unit: (n: number) => string; scope: LeaderboardScope; tipHref?: string;
}) {
  const rank = rankFor(row.rankPoints);
  // The global board names each person's town instead of their rank, so it doubles as a way into town pages.
  const detail = scope.kind === 'global' && row.communityName ? row.communityName : rank.name;
  const profileHref = `/members/${row.profileId}`;
  const profileLabel = `${ordinal(row.place)}, ${row.name}, ${row.score} ${unit(row.score)}. View profile`;
  const markers = <>
    <span className={styles.pos} data-medal={row.place <= 3 ? row.place : undefined}>{row.place}</span>
    <img className={styles.rowBug} src={rank.artwork} alt="" />
  </>;
  const score = <span className={styles.score}><b>{row.score}</b> {unit(row.score)}</span>;

  return <li>{tipHref ? (
    <div className={styles.row}>
      {markers}
      <div className={styles.who}>
        <Link className={styles.profileName} href={profileHref} aria-label={profileLabel} title={row.name}>{row.name}</Link>
        <span>{detail}</span>
      </div>
      <div className={styles.rowActions}>
        {score}
        <LeaderboardTipAction name={row.name} href={tipHref} />
      </div>
    </div>
  ) : (
    <Link className={styles.row} href={profileHref} aria-label={profileLabel}>
      {markers}
      <span className={styles.who}><strong title={row.name}>{row.name}</strong><span>{detail}</span></span>
      {score}
    </Link>
  )}</li>;
}

/** Placeholder rows while a leaderboard page loads. */
export function LeaderboardSkeleton() {
  return <div className={styles.page}>
    <div className={styles.layout} data-single="">
      <div className={styles.main}>
        <section className={styles.race} aria-busy="true" aria-label="Loading the leaderboard">
          <ol className={styles.lanes}>
            {Array.from({ length: 6 }, (_, index) => <li key={index} aria-hidden="true"><span className={styles.row}>
              <span className={styles.skelDot} /><span className={styles.skelBug} />
              <span className={styles.who}><span className={styles.skelName} /><span className={styles.skelLine} /></span>
              <span className={styles.skelScore} />
            </span></li>)}
          </ol>
        </section>
      </div>
    </div>
  </div>;
}
