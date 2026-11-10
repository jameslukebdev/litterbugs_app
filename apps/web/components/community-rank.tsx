'use client';
/* eslint-disable @next/next/no-img-element -- the animated progress marker, like the map's bugs. */
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useDataRefresh } from '@/lib/use-data-refresh';
import { createClient } from '@/lib/supabase/client';
import styles from './community-rank.module.css';

// Keep thresholds in sync with mobile/lib/ranking.js. The web uses logo-style artwork.
const ranks = [
  { name: 'Gnat', points: 0, artwork: '/brand/ranks/gnat.svg' },
  { name: 'Ladybug', points: 1, artwork: '/brand/ranks/ladybug.svg' },
  { name: 'Honeybee', points: 12, artwork: '/brand/bugs/bee.png' },
  { name: 'Lightning Bug', points: 30, artwork: '/brand/ranks/lightning-bug.svg' },
  { name: 'Caterpillar', points: 60, artwork: '/brand/ranks/caterpillar.svg' },
  { name: 'Cocoon', points: 90, artwork: '/brand/ranks/cocoon.svg' },
  { name: 'Butterfly', points: 120, artwork: '/brand/bugs/butterfly.png' },
  { name: 'Dragonfly', points: 150, artwork: '/brand/ranks/dragonfly.svg' },
];
const pendingRanks = new Map<string, Promise<number>>();
function loadRank(userId: string) {
  const existing = pendingRanks.get(userId);
  if (existing) return existing;
  const work = Promise.resolve(createClient().rpc('get_rank_points', { target_user_id: userId })).then(({ data, error }) => {
    if (error) throw error;
    return Math.max(0, Math.floor(Number(data) || 0));
  }).finally(() => pendingRanks.delete(userId));
  pendingRanks.set(userId, work);
  return work;
}
/**
 * `hold` keeps the loading look even after the points arrive, so a page can reveal this card together
 * with the rest of its content; `onReady` says the points (or an error) have arrived.
 */
export function CommunityRank({ userId, compact = false, hold = false, onReady, preview = false, progressMarker = preview ? 'cocoon' : 'caterpillar' }: {
  userId: string;
  compact?: boolean;
  hold?: boolean;
  onReady?: () => void;
  preview?: boolean;
  progressMarker?: 'cocoon' | 'caterpillar';
}) {
  const refreshRevision = useDataRefresh();
  const [loadedPoints, setPoints] = useState<number | null>(null);
  const [loadError, setError] = useState(false);
  const points = hold ? null : loadedPoints;
  const error = hold ? false : loadError;
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void loadRank(userId).then(value => { if (!cancelled) { setError(false); setPoints(value); onReady?.(); } }).catch(() => { if (!cancelled) { setError(true); setPoints(null); onReady?.(); } });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onReady is a notification, not an input.
  }, [userId, attempt, refreshRevision]);
  const index = ranks.reduce((current, rank, index) => (points ?? 0) >= rank.points ? index : current, 0);
  const rank = ranks[index];
  const next = ranks[index + 1];
  const progress = points === null ? 0 : next ? Math.round(100 * (points - rank.points) / (next.points - rank.points)) : 100;
  if (compact) return points === null ? null : <span className="community-rank-badge"><Image src={rank.artwork} width={22} height={22} alt="" /><span>{rank.name}</span></span>;
  const artworkSize = preview ? 32 : 56;
  return <section className={preview ? 'community-rank community-rank--preview' : 'community-rank'} aria-label="Community rank" aria-busy={points === null && !error}>
    <div className="community-rank-summary">
      {points !== null ? <Image src={rank.artwork} width={artworkSize} height={artworkSize} alt="" /> : <span className="account-skeleton community-rank-artwork" aria-hidden />}
      <div>
        <h3>{points === null ? error ? 'Unavailable' : <span className="account-skeleton account-skeleton-name" role="status" aria-label="Loading rank" /> : rank.name}</h3>
        <p className="community-rank-meta">{points !== null ? `${preview ? '' : 'Your rank · '}${points} ${points === 1 ? 'point' : 'points'}` : '\u200b'}</p>
      </div>
    </div>
    <div className="community-rank-progress" style={points === null ? { visibility: 'hidden' } : undefined} aria-hidden={points === null}>
      <progress className="sr-only" max={100} value={progress} aria-label={next ? `${progress}% of the way to ${next.name}` : 'Highest rank reached'} />
      {/* Remount the bar when points arrive so the fill and marker animate together. */}
      <div className="community-rank-bar" aria-hidden="true" key={points === null ? 'waiting' : 'ready'}>
        <span className="community-rank-bar-fill" style={{ width: `${progress}%` }} />
        {points !== null && <img className="community-rank-bar-bug" src={`/brand/ranks/${progressMarker}.svg`} alt="" style={{ left: `${progress}%` }} />}
      </div>
      {!preview && <p className="community-rank-next">
        {next ? <>{points !== null ? <Image src={next.artwork} width={20} height={20} alt="" /> : <span aria-hidden style={{ display: 'inline-block', width: 20, height: 20, flex: 'none' }} />}<span><strong>{next.points - (points ?? 0)} {next.points - (points ?? 0) === 1 ? 'point' : 'points'}</strong> to {next.name}</span></> : 'Highest rank reached'}
      </p>}
    </div>
    {error && <button className="secondary-button" onClick={() => { setError(false); setAttempt(value => value + 1); }}>Retry loading rank</button>}
    {!preview && <details>
      <summary>How points work</summary>
      <div className={styles.guide}>
        <h4>How to earn points</h4>
        <dl className={styles.earnings}>
          <div><dt>+1 point</dt><dd>When your report is accepted after review</dd></div>
          <div><dt>+3 points</dt><dd>When your cleanup is confirmed complete</dd></div>
        </dl>
        <ul className={styles.limits}>
          <li>You can earn up to 5 points from reports in any 24-hour period.</li>
          <li>A report within 25 metres of a spot that earned you points in the past 7 days won’t earn another point. You can still report new litter there.</li>
        </ul>
        <h4>Ranks by total points</h4>
        <ol className={styles.ranks} role="list">
          {ranks.map(({ name, points, artwork }) => <li key={name}>
            <Image src={artwork} width={36} height={36} alt="" />
            <span><strong>{name}</strong><span>{points} {points === 1 ? 'point' : 'points'}</span></span>
          </li>)}
        </ol>
      </div>
    </details>}
  </section>;
}
