import { beforeEach, describe, expect, it, vi } from 'vitest';
const { loadFeed } = vi.hoisted(() => ({ loadFeed: vi.fn() }));
vi.mock('./public-report-feed', () => ({ loadPublicReportFeed: loadFeed }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));
import { archivePageNumber, loadCleanupArchive } from './cleanup-archive';
beforeEach(() => vi.clearAllMocks());
describe('archive URL validation', () => {
  it('accepts the first page and bounded positive page numbers', () => {
    expect(archivePageNumber(undefined)).toBe(1);
    expect(archivePageNumber('1')).toBe(1);
    expect(archivePageNumber('1000')).toBe(1000);
  });
  it.each(['0', '-1', '1.5', 'Infinity', '1001', '01', '', 'text', ['1', '2']])(
    'rejects malformed or repeated page parameters %j',
    (value) => {
      expect(archivePageNumber(value)).toBeNull();
    },
  );
  it('preserves an empty first page and the last populated page', async () => {
    loadFeed.mockResolvedValue({
      reports: [],
      unavailable: false,
      hasMore: false,
    });
    await expect(loadCleanupArchive(1)).resolves.toHaveProperty('reports', []);
    loadFeed.mockResolvedValue({
      reports: [{ id: 'last-report' }],
      unavailable: false,
      hasMore: false,
    });
    await expect(loadCleanupArchive(2)).resolves.toHaveProperty('reports', [
      { id: 'last-report' },
    ]);
  });
  it('marks a genuinely out-of-range archive as missing', async () => {
    loadFeed.mockResolvedValue({
      reports: [],
      unavailable: false,
      hasMore: false,
    });
    await expect(loadCleanupArchive(999)).rejects.toThrow('NOT_FOUND');
  });
  it('does not treat a backend outage as a deleted archive', async () => {
    loadFeed.mockResolvedValue({
      reports: [],
      unavailable: true,
      hasMore: false,
    });
    await expect(loadCleanupArchive(2)).resolves.toHaveProperty(
      'unavailable',
      true,
    );
  });
});
