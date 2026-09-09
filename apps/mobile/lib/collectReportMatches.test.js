import { expect, it } from 'vitest';
import { collectReportMatches } from './collectReportMatches';
import { matchesReportFilters, DEFAULT_REPORT_FILTERS } from './reportFilters';
it('finds sparse funded matches beyond the first thousand rows', async () => {
  const rows = Array.from({length: 1600}, (_, id) => ({ id, funded_amount_cents: id > 1200 ? 600 : 0 }));
  const result = await collectReportMatches((offset, size) => Promise.resolve(rows.slice(offset, offset + size)), report => matchesReportFilters(report, {...DEFAULT_REPORT_FILTERS, funding: 'funded'}, null));
  expect(result.reports).toHaveLength(399);
  expect(result.reports[0].id).toBe(1201);
  expect(result.truncated).toBe(false);
});
it('caps matching native work while reporting an actual extra match', async () => {
  const rows = Array.from({length: 1700}, (_, id) => ({id}));
  const result = await collectReportMatches((offset, size) => Promise.resolve(rows.slice(offset, offset + size)), () => true);
  expect(result.reports).toHaveLength(1000); expect(result.truncated).toBe(true);
});
it('does not mistake an exactly full result for truncation or swallow failures', async () => {
  const rows = Array.from({length: 1000}, (_, id) => ({id}));
  expect((await collectReportMatches((offset, size) => Promise.resolve(rows.slice(offset, offset + size)), () => true)).truncated).toBe(false);
  await expect(collectReportMatches(() => Promise.reject(new Error('offline')), () => true)).rejects.toThrow('offline');
});
