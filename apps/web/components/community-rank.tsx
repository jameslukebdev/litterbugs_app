'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Same thresholds and artwork as mobile/lib/ranking.js.
const ranks = [
  { id: 'gnat', name: 'Gnat', points: 0 },
  { id: 'ladybug', name: 'Ladybug', points: 1 },
  { id: 'honeybee', name: 'Honeybee', points: 12 },
  { id: 'lightning-bug', name: 'Lightning Bug', points: 30 },
  { id: 'caterpillar', name: 'Caterpillar', points: 60 },
  { id: 'cocoon', name: 'Cocoon', points: 90 },
  { id: 'butterfly', name: 'Butterfly', points: 120 },
  { id: 'dragonfly', name: 'Dragonfly', points: 150 },
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
export function CommunityRank({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const [points, setPoints] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void loadRank(userId).then(value => { if (!cancelled) { setError(false); setPoints(value); } }).catch(() => { if (!cancelled) { setError(true); setPoints(null); } });
    return () => { cancelled = true; };
  }, [userId, attempt]);
  const index = ranks.reduce((current, rank, index) => (points ?? 0) >= rank.points ? index : current, 0);
  const rank = ranks[index];
  const next = ranks[index + 1];
  const progress = points === null ? 0 : next ? Math.round(100 * (points - rank.points) / (next.points - rank.points)) : 100;
  if (compact) return points === null ? null : <span className="community-rank-badge"><Image src={`/brand/ranks/${rank.id}.png`} width={22} height={22} alt="" /><span>{rank.name}</span></span>;
  return <section className="community-rank" aria-label="Community rank">
    <div className="community-rank-summary">
      {points !== null && <Image src={`/brand/ranks/${rank.id}.png`} width={72} height={72} alt="" />}
      <div><small>Community rank</small><h3>{points === null ? error ? 'Unavailable' : 'Loading…' : rank.name}</h3></div>
      {points !== null && <strong>{points} {points === 1 ? 'point' : 'points'}</strong>}
    </div>
    {points !== null && <><p>{next ? `Next rank: ${next.name}` : 'Highest rank reached'} <strong>{progress}%</strong></p><progress max={100} value={progress} aria-label="Progress toward next rank" />{next && <small>{next.points - points} points to go</small>}</>}
    {error && <button className="secondary-button" onClick={() => { setError(false); setAttempt(value => value + 1); }}>Retry loading rank</button>}
    <details><summary>How points work</summary><p>Earn 1 point when a report is accepted after review, and 3 points when a cleanup is confirmed complete.</p><p>You can earn up to 5 report points in a rolling 24 hours. Another report within 25 metres of a location credited to you in the previous 7 days does not earn another point. You can still report new litter there.</p></details>
  </section>;
}
