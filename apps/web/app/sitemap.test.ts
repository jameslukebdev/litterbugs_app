import { expect, it, vi } from 'vitest';
const { loadIndex } = vi.hoisted(() => ({ loadIndex: vi.fn() }));
vi.mock('@/lib/env', () => ({ getSiteUrl: () => 'https://litterbugs.app' }));
vi.mock('@/lib/public-report-index', () => ({ loadPublicReportIndex: loadIndex }));
vi.mock('@/lib/community-leaderboards', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/community-leaderboards')>(),
  loadCommunityDirectory: async () => ({ unavailable: false, communities: [
    { path: '/communities/us/nc/boone', name: 'Boone', countryName: 'United States', regionName: 'North Carolina', isIndexable: true, lastActivityAt: '2026-11-10T12:00:00Z' },
    { path: '/communities/us/nc/greensboro', name: 'Greensboro', countryName: 'United States', regionName: 'North Carolina', isIndexable: false, lastActivityAt: '2026-11-01T12:00:00Z' },
    { path: '/communities/pe/lim/chorrillos', name: 'Chorrillos', countryName: 'Peru', regionName: 'Lima', isIndexable: false, lastActivityAt: '2026-10-01T12:00:00Z' },
  ] }),
}));
vi.mock('server-only', () => ({}));
import sitemap from './sitemap';

it('lists the directory and stable photo URLs without inventing modification dates', async () => {
  loadIndex.mockResolvedValue([
    { id: 'open', path: '/litter-reports/roadside-open', hasBeforePhoto: true, hasAfterPhoto: false },
    { id: 'done', path: '/litter-reports/creek-done', hasBeforePhoto: true, hasAfterPhoto: true, completedAt: '2026-11-09T17:15:24Z' },
    { id: 'no-photo', path: '/litter-reports/lot-no-photo', hasBeforePhoto: false, hasAfterPhoto: false },
  ]);
  const result = await sitemap();
  expect(result).toContainEqual({ url: 'https://litterbugs.app/reports' });
  // Only community pages with substance are offered to search engines.
  expect(result).toContainEqual({ url: 'https://litterbugs.app/communities/us/nc/boone', lastModified: new Date('2026-11-10T12:00:00Z') });
  expect(result.some(item => item.url.endsWith('/greensboro'))).toBe(false);
  // Country and state lists join once they hold an indexed town, dated by their latest activity.
  expect(result).toContainEqual({ url: 'https://litterbugs.app/communities/us', lastModified: new Date('2026-11-10T12:00:00Z') });
  expect(result).toContainEqual({ url: 'https://litterbugs.app/communities/us/nc', lastModified: new Date('2026-11-10T12:00:00Z') });
  expect(result.some(item => item.url.includes('/communities/pe'))).toBe(false);
  // Pages are listed at their readable address; photos stay under the id address.
  expect(result).toContainEqual({ url: 'https://litterbugs.app/litter-reports/roadside-open', images: ['https://litterbugs.app/reports/open/photo/before'] });
  expect(result).toContainEqual({ url: 'https://litterbugs.app/litter-reports/creek-done', lastModified: new Date('2026-11-09T17:15:24Z'), images: ['https://litterbugs.app/reports/done/photo/before', 'https://litterbugs.app/reports/done/photo/after'] });
  expect(result).toContainEqual({ url: 'https://litterbugs.app/litter-reports/lot-no-photo' });
  // Only a recorded completion counts as a modification; open reports stay undated.
  expect(result.filter(item => item.url.includes('/litter-reports/') && !item.url.endsWith('-done')).every(item => !item.lastModified)).toBe(true);
  expect(result.some(item => /\/account|\/map|\?/.test(item.url))).toBe(false);
  expect(new Set(result.map(item => item.url)).size).toBe(result.length);
});
