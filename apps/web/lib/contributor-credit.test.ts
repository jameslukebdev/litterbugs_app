import { expect, it, vi } from 'vitest';
import { withContributorCredits, type ContributorCredit } from './contributor-credit';

it('holds report results until their donor details are available', async () => {
  let resolve!: (rows: ContributorCredit[]) => void;
  const request = new Promise<ContributorCredit[]>(done => { resolve = done; });
  const complete = vi.fn();
  const result = withContributorCredits([{ id: 'report' }], () => request).then(complete);
  await Promise.resolve();
  expect(complete).not.toHaveBeenCalled();
  const credit = { report_id: 'report', names: ['Donor'], anonymous_count: 0 };
  resolve([credit]);
  await result;
  expect(complete).toHaveBeenCalledWith([{ id: 'report', contributorCredit: credit }]);
});

it('reuses resolved donor data and records empty credit without a later fetch', async () => {
  const load = vi.fn().mockResolvedValue([]);
  const existing = { report_id: 'first', names: ['Donor'], anonymous_count: 0 };
  const rows = await withContributorCredits([
    { id: 'first', contributorCredit: existing }, { id: 'empty', contributorCredit: null }, { id: 'new' },
  ], load);
  expect(load).toHaveBeenCalledExactlyOnceWith(['new']);
  expect(rows.map(row => row.contributorCredit)).toEqual([existing, null, null]);
});
