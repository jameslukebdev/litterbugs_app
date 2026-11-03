import { expect, it, vi } from 'vitest';
const { loadIndex } = vi.hoisted(() => ({ loadIndex: vi.fn() }));
vi.mock('@/lib/env', () => ({ getSiteUrl: () => 'https://litterbugs.app' }));
vi.mock('@/lib/public-report-index', () => ({ loadPublicReportIndex: loadIndex }));
import sitemap from './sitemap';

it('lists the directory and stable photo URLs without inventing modification dates', async () => {
  loadIndex.mockResolvedValue([
    { id: 'open', hasBeforePhoto: true, hasAfterPhoto: false },
    { id: 'done', hasBeforePhoto: true, hasAfterPhoto: true },
    { id: 'no-photo', hasBeforePhoto: false, hasAfterPhoto: false },
  ]);
  const result = await sitemap();
  expect(result).toContainEqual({ url: 'https://litterbugs.app/reports' });
  expect(result).toContainEqual({ url: 'https://litterbugs.app/reports/open', images: ['https://litterbugs.app/reports/open/photo/before'] });
  expect(result).toContainEqual({ url: 'https://litterbugs.app/reports/done', images: ['https://litterbugs.app/reports/done/photo/before', 'https://litterbugs.app/reports/done/photo/after'] });
  expect(result).toContainEqual({ url: 'https://litterbugs.app/reports/no-photo' });
  expect(result.filter(item => item.url.includes('/reports/')).every(item => !item.lastModified)).toBe(true);
  expect(result.some(item => /\/account|\/map|\?/.test(item.url))).toBe(false);
  expect(new Set(result.map(item => item.url)).size).toBe(result.length);
});
