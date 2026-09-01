import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({
  supabase: { rpc: vi.fn() },
}));

import {
  acknowledgeCurrentRank,
  loadPendingRankCelebration,
  loadRanking,
} from './rankingService';

describe('ranking data service', () => {
  it('loads authoritative points and derives the ranking summary', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 42, error: null });

    await expect(loadRanking('user-42', { rpc })).resolves.toEqual({
      points: 42,
      rank: 'Lightning Bug',
      rankMin: 30,
      nextRank: 'Caterpillar',
      nextRankAt: 60,
      pointsRemaining: 18,
      progress: 0.4,
    });
    expect(rpc).toHaveBeenCalledWith('get_rank_points', {
      target_user_id: 'user-42',
    });
  });

  it('derives the terminal rank without storing a rank string', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 168, error: null });

    await expect(loadRanking('dragonfly-user', { rpc })).resolves.toEqual({
      points: 168,
      rank: 'Dragonfly',
      rankMin: 150,
      nextRank: null,
      nextRankAt: null,
      pointsRemaining: 0,
      progress: 1,
    });
  });

  it('rejects missing users and backend failures', async () => {
    await expect(loadRanking(null, { rpc: vi.fn() })).rejects.toThrow(
      'A user ID is required to load ranking data.',
    );

    const backendError = new Error('Ranking unavailable');
    const rpc = vi.fn().mockResolvedValue({ data: null, error: backendError });
    await expect(loadRanking('user-error', { rpc })).rejects.toBe(backendError);
  });

  it('loads only the highest unacknowledged rank', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 15, error: null });

    const result = await loadPendingRankCelebration('user-15', 0, { rpc });

    expect(result.ranking.points).toBe(15);
    expect(result.pendingRank?.name).toBe('Honeybee');
  });

  it('acknowledges the current authoritative rank total', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 30, error: null });

    await expect(acknowledgeCurrentRank({ rpc })).resolves.toBe(30);
    expect(rpc).toHaveBeenCalledWith('acknowledge_current_rank');
  });
});
