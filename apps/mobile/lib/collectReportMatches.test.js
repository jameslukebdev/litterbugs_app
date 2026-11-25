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

it('keeps the newest explicit site round before matching filters across pages', async () => {
  const rows = [
    { id: 'new', cleanup_site_id: 'site', funded_amount_cents: 0 },
    { id: 'old', cleanup_site_id: 'site', funded_amount_cents: 3500 },
    { id: 'other', funded_amount_cents: 3500 },
  ];
  const fetchPage = async (offset, size) => rows.slice(offset, offset + size);
  const funded = report => report.funded_amount_cents > 0;
  const identity = report => report.cleanup_site_id || report.id;
  const result = await collectReportMatches(fetchPage, funded, { pageSize: 1, identity });
  expect(result.reports.map(report => report.id)).toEqual(['other']);
  // Favorites and hidden history can deliberately retain individual rounds.
  const saved = await collectReportMatches(fetchPage, funded, { pageSize: 1 });
  expect(saved.reports.map(report => report.id)).toEqual(['old', 'other']);
});
