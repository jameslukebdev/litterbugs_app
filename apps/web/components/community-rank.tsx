'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useDataRefresh } from '@/lib/use-data-refresh';
import { createClient } from '@/lib/supabase/client';

// Keep thresholds in sync with mobile/lib/ranking.js. The web uses logo-style artwork.
const ranks = [
  { name: 'Gnat', points: 0, artwork: '/brand/ranks/gnat.svg' },
  { name: 'Ladybug', points: 1, artwork: '/brand/bugs/ladybug.png' },
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
export function CommunityRank({ userId, compact = false, hold = false, onReady }: { userId: string; compact?: boolean; hold?: boolean; onReady?: () => void }) {
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
  return <section className="community-rank" aria-label="Community rank" aria-busy={points === null && !error}>
    <div className="community-rank-summary">
      {points !== null ? <Image src={rank.artwork} width={72} height={72} alt="" /> : <span className="account-skeleton community-rank-artwork" aria-hidden />}
      <div><h3>{points === null ? error ? 'Unavailable' : <span className="account-skeleton account-skeleton-name" role="status" aria-label="Loading rank" /> : rank.name}</h3></div>
      {points !== null && <strong>{points} {points === 1 ? 'point' : 'points'}</strong>}
    </div>
    <div className="community-rank-progress" style={points === null ? { visibility: 'hidden' } : undefined} aria-hidden={points === null}>
      <p>
        {next ? <span className="community-rank-badge">{points !== null ? <Image src={next.artwork} width={22} height={22} alt="" /> : <span aria-hidden style={{ display: 'inline-block', width: 22, height: 22, flex: 'none' }} />}Next rank: {next.name}</span> : 'Highest rank reached'}
        <strong>{progress}%</strong>
      </p>
      <progress max={100} value={progress} aria-label="Progress toward next rank" />
      {next && <small>{next.points - (points ?? 0)} points to go</small>}
    </div>
    {error && <button className="secondary-button" onClick={() => { setError(false); setAttempt(value => value + 1); }}>Retry loading rank</button>}
    <details><summary>How points work</summary><p>Earn 1 point when a report is accepted after review, and 3 points when a cleanup is confirmed complete.</p><p>You can earn up to 5 report points in a rolling 24 hours. Another report within 25 metres of a location credited to you in the previous 7 days does not earn another point. You can still report new litter there.</p></details>
  </section>;
}
