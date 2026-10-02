import { beforeEach, describe, expect, it, vi } from 'vitest';
const { loadPhoto } = vi.hoisted(() => ({ loadPhoto: vi.fn() }));
vi.mock('@/lib/public-report-share', () => ({ loadPublicReportPhoto: loadPhoto }));
import { GET } from './route';
const get = (kind = 'before') => GET(new Request('https://litterbugs.app/reports/id/photo/before'), {
  params: Promise.resolve({ id: 'report-id', kind }),
});
beforeEach(() => { loadPhoto.mockReset(); });
describe('public report photo response', () => {
  it('returns JPEG bytes without allowing stale public caches', async () => {
    loadPhoto.mockResolvedValue(Buffer.from([1, 2, 3]));
    const response = await get();
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(response.headers.get('content-length')).toBe('3');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
  it('rejects arbitrary photo selectors before loading', async () => {
    expect((await get('other.jpg')).status).toBe(404);
    expect(loadPhoto).not.toHaveBeenCalled();
  });
  it('returns uncached errors for missing photos and failed access checks', async () => {
    loadPhoto.mockResolvedValue(null);
    expect((await get()).status).toBe(404);
    loadPhoto.mockRejectedValue(new Error('database unavailable'));
    const response = await get();
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
