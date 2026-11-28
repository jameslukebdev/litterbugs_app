import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const invoke = vi.fn();
vi.mock('./supabase', () => ({ supabase: { rpc: (...args) => rpc(...args), functions: { invoke: (...args) => invoke(...args) } } }));
vi.mock('./edgeFunctionError', () => ({ edgeFunctionErrorMessage: async (data, error, fallback) => data?.error || fallback }));

import {
  communityLabel, daysLeftLabel, defaultBoard, defaultPeriod, loadBoards, loadTipEligible, monthInfo, ordinal,
  parseTipAmount, startTip, tipFeeCents,
} from './community';

beforeEach(() => { rpc.mockReset(); invoke.mockReset(); });

describe('tip amounts', () => {
  it('accepts $3 to $1,000 in dollars or dollars and cents, like the website', () => {
    expect(parseTipAmount('5')).toBe(500);
    expect(parseTipAmount('$7.50')).toBe(750);
    expect(parseTipAmount('2.99')).toBeNull();
    expect(parseTipAmount('1000.01')).toBeNull();
    expect(parseTipAmount('abc')).toBeNull();
  });
  it('adds the same service fee as the backend: 50¢ plus 5%', () => {
    expect(tipFeeCents(500)).toBe(75);
    expect(tipFeeCents(1000)).toBe(100);
    expect(tipFeeCents(2000)).toBe(150);
  });
});

describe('leaderboard choices', () => {
  const boards = { clean: { month: [{}, {}], all: [{}] }, report: { month: [{}, {}, {}], all: [{}] }, fund: { month: [], all: [] } };
  it('opens on All time when the month board has fewer than three people', () => {
    expect(defaultPeriod(boards, 'clean')).toBe('all');
    expect(defaultPeriod(boards, 'report')).toBe('month');
  });
  it('opens on the first board with anyone on it', () => {
    expect(defaultBoard({ ...boards, clean: { month: [], all: [] } })).toBe('report');
    expect(defaultBoard(boards)).toBe('clean');
  });
  it('words places, days and towns the way the website does', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd']);
    expect(daysLeftLabel(0)).toBe('Ends today');
    expect(daysLeftLabel(1)).toBe('1 day left');
    expect(communityLabel({ name: 'Boone', country_code: 'US', region_code: 'US-NC' })).toBe('Boone, NC');
    expect(communityLabel({ name: 'Mar del Plata', country_code: 'AR', region_code: 'AR-B', country_name: 'Argentina' })).toBe('Mar del Plata, Argentina');
  });
  it('counts the days left in the month in the town’s time zone', () => {
    expect(monthInfo('America/New_York', new Date('2026-11-28T02:00:00Z'))).toEqual({ monthName: 'November', daysLeft: 3 });
  });
});

describe('loading', () => {
  it('loads all six boards for a town and keeps the public short names', async () => {
    rpc.mockImplementation(async (name, args) => ({ data: [{ place: 1, profile_id: `${args.p_board}-${args.p_period}`, name: 'Maya R.', score: 4, rank_points: 13, community_name: 'Boone', community_path: '/x' }], error: null }));
    const boards = await loadBoards('boone-nc');
    expect(rpc).toHaveBeenCalledTimes(6);
    expect(rpc).toHaveBeenCalledWith('community_leaderboard', { p_community: 'boone-nc', p_board: 'fund', p_period: 'all', p_limit: 100 });
    expect(boards.report.month[0]).toEqual({ place: 1, profileId: 'report-month', name: 'Maya R.', score: 4, rankPoints: 13, communityName: 'Boone' });
  });
  it('asks which people can be tipped, sending only real profile ids', async () => {
    const id = '11111111-2222-3333-4444-555555555555';
    rpc.mockResolvedValue({ data: [id], error: null });
    const eligible = await loadTipEligible([id, id, 'not-an-id']);
    expect(rpc).toHaveBeenCalledWith('tip_eligible_profiles', { profile_ids: [id] });
    expect(eligible.has(id)).toBe(true);
    rpc.mockResolvedValue({ data: null, error: { message: 'down' } });
    expect((await loadTipEligible([id])).size).toBe(0);
  });
  it('starts a tip through the same backend as the website, with the name, note and report', async () => {
    invoke.mockResolvedValue({ data: { tipId: 't', clientSecret: 'pi_secret', publishableKey: 'pk_test_1', tipAmountCents: 500 }, error: null });
    await startTip({ profileId: 'p', tipAmountCents: 500, clientRequestId: 'r', role: 'reporter', tipperName: 'Sam', note: 'Thanks!', reportId: 'rep' });
    expect(invoke).toHaveBeenCalledWith('create-cleaner-tip', { body: { cleanerId: 'p', tipAmountCents: 500, clientRequestId: 'r', role: 'reporter', tipperName: 'Sam', note: 'Thanks!', reportId: 'rep' } });
    invoke.mockResolvedValue({ data: { error: 'Tips are paused right now.' }, error: null });
    await expect(startTip({ profileId: 'p', tipAmountCents: 500, clientRequestId: 'r' })).rejects.toThrow('Tips are paused right now.');
  });
});
