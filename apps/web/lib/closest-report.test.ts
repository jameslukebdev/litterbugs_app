import { beforeEach, expect, it, vi } from 'vitest';
import type { MappableReport } from '@litterbugs/report-contract';
import { closestSearchArea, findClosestReport } from './closest-report';
import { DEFAULT_DISCOVERY_FILTERS, loadDiscoveryReports } from './report-discovery';
vi.mock('./report-discovery', async original => ({ ...await original<typeof import('./report-discovery')>(), loadDiscoveryReports: vi.fn() }));
const load = vi.mocked(loadDiscoveryReports);
const report = (id: string, latitude: number, longitude: number) => ({ id, latitude, longitude, title: id }) as MappableReport;
const args = () => ({ center: { latitude: 0, longitude: 0 }, filters: { ...DEFAULT_DISCOVERY_FILTERS, funding: 'funded' as const, severity: 'high' as const, radius: 5 as const }, favorites: new Set<string>(), hidden: new Set(['hidden']), signal: new AbortController().signal });
beforeEach(() => vi.resetAllMocks());
it('finds the closest match beyond the regular list cap and preserves non-geographic filters', async () => {
  load.mockResolvedValue({ reports: [...Array.from({ length: 1000 }, (_, i) => report(String(i), .3, 0)), report('nearest', .01, 0)], truncated: false });
  const input = args();
  const result = await findClosestReport({} as never, input);
  expect(result?.report.id).toBe('nearest');
  expect(load.mock.calls[0][1]).toMatchObject({ filters: { funding: 'funded', severity: 'high', radius: 0 }, hidden: input.hidden, limit: Infinity });
  expect(load).toHaveBeenCalledTimes(1);
});
it('does not mistake a box-corner candidate for the nearest until its entire distance ring is searched', async () => {
  load.mockResolvedValueOnce({ reports: [report('corner', .35, .35)], truncated: false });
  load.mockResolvedValueOnce({ reports: [report('corner', .35, .35), report('closer-outside-first-box', .4, 0)], truncated: false });
  expect((await findClosestReport({} as never, args()))?.report.id).toBe('closer-outside-first-box');
  expect(load).toHaveBeenCalledTimes(2);
});
it('supports the dateline and poles without excluding nearer reports', () => {
  const dateline = closestSearchArea({ latitude: 0, longitude: 179.99 }, 25);
  expect(dateline.west).toBeGreaterThan(dateline.east);
  const pole = closestSearchArea({ latitude: 89.99, longitude: 40 }, 25);
  expect(pole).toMatchObject({ west: -180, east: 180, north: 90 });
  expect(closestSearchArea({ latitude: 0, longitude: 0 }, 12500)).toMatchObject({ west: -180, east: 180, north: 90, south: -90 });
});
it('returns an empty result only after successful searches and propagates failures', async () => {
  load.mockResolvedValue({ reports: [], truncated: false });
  expect(await findClosestReport({} as never, args())).toBeNull();
  expect(load).toHaveBeenCalledTimes(5);
  load.mockRejectedValue(new Error('Offline'));
  await expect(findClosestReport({} as never, args())).rejects.toThrow('Offline');
});
it('does not continue a superseded search', async () => {
  const controller = new AbortController(); controller.abort();
  await expect(findClosestReport({} as never, { ...args(), signal: controller.signal })).rejects.toThrow('cancelled');
  expect(load).not.toHaveBeenCalled();
});
