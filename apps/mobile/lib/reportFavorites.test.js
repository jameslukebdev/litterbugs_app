import { beforeEach, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn() }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: storage }));
import { loadReportFavorites, saveReportFavorites, toggleFavoriteId } from './reportFavorites';
import { DEFAULT_REPORT_FILTERS, matchesReportFilters } from './reportFilters';
beforeEach(() => { vi.clearAllMocks(); storage.setItem.mockResolvedValue(); });
it('persists favorites separately for each account', async () => {
  await saveReportFavorites('one', ['r1']);
  await saveReportFavorites('two', ['r2']);
  expect(storage.setItem).toHaveBeenCalledWith('litterbugs.report-favorites.v1.one', '["r1"]');
  expect(storage.setItem).toHaveBeenCalledWith('litterbugs.report-favorites.v1.two', '["r2"]');
  storage.getItem.mockResolvedValue('["r1","r1",null]');
  expect(await loadReportFavorites('one')).toEqual(['r1']);
});
it('handles corrupt data and toggles without duplicates', async () => {
  storage.getItem.mockResolvedValue('{bad');
  expect(await loadReportFavorites('one')).toEqual([]);
  expect(toggleFavoriteId(['a'], 'a')).toEqual([]);
  expect(toggleFavoriteId(['a'], 'b')).toEqual(['a', 'b']);
});
it('continues queued writes after a storage failure', async () => {
  storage.setItem.mockRejectedValueOnce(new Error('disk')).mockResolvedValueOnce();
  await expect(saveReportFavorites('one', ['a'])).rejects.toThrow('disk');
  await saveReportFavorites('one', ['a', 'b']);
  expect(storage.setItem).toHaveBeenLastCalledWith('litterbugs.report-favorites.v1.one', '["a","b"]');
});
it('combines favorites with the existing report filters', () => {
  const report = { id: 'a', cleanup_state: 'available', funded_amount_cents: 500 };
  const filters = { ...DEFAULT_REPORT_FILTERS, favoritesOnly: true };
  expect(matchesReportFilters(report, filters, null, ['a'])).toBe(true);
  expect(matchesReportFilters(report, filters, null, ['b'])).toBe(false);
  expect(matchesReportFilters(report, { ...filters, status: 'completed' }, null, ['a'])).toBe(false);
});
