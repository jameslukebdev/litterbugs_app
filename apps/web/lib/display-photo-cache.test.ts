import { beforeEach, describe, expect, it, vi } from 'vitest';

const { stored, cacheFactory } = vi.hoisted(() => ({
  stored: new Map<string, string>(),
  cacheFactory: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: cacheFactory }));

import { loadDisplayPhoto, PhotoSourceError } from './display-photo-cache';

beforeEach(() => {
  stored.clear();
  cacheFactory.mockReset();
  cacheFactory.mockImplementation((generate, parts) => async () => {
    const key = JSON.stringify(parts);
    if (!stored.has(key)) stored.set(key, await generate());
    return stored.get(key);
  });
});

describe('server-side display photos', () => {
  it('reuses identical bytes across requests, without retaining credentials in its keys', async () => {
    const generate = vi.fn(async () => Buffer.from([0, 1, 254, 255]));
    const first = await loadDisplayPhoto('report_photos', 'owner/report/photo.jpg', 'card', generate);
    const second = await loadDisplayPhoto('report_photos', 'owner/report/photo.jpg', 'card', generate);
    expect(first).toEqual(second);
    expect(generate).toHaveBeenCalledOnce();
    expect(cacheFactory.mock.calls[0][1]).toEqual(['display-photo-v1', expect.stringMatching(/^[a-f0-9]{64}$/)]);
    expect(cacheFactory.mock.calls[0][2]).toEqual({ revalidate: 604800 });
  });

  it('isolates photo paths, buckets, sizes, and projects', async () => {
    const generate = vi.fn(async () => Buffer.from('photo'));
    await loadDisplayPhoto('report_photos', 'one.jpg', 'card', generate);
    await loadDisplayPhoto('report_photos', 'two.jpg', 'card', generate);
    await loadDisplayPhoto('cleanup_photos', 'one.jpg', 'card', generate);
    await loadDisplayPhoto('report_photos', 'one.jpg', 'detail', generate);
    await loadDisplayPhoto('report_photos', 'one.jpg', 'social-1080', generate);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://another-project.supabase.co');
    try {
      await loadDisplayPhoto('report_photos', 'one.jpg', 'card', generate);
    } finally {
      vi.unstubAllEnvs();
    }
    expect(generate).toHaveBeenCalledTimes(6);
  });

  it('coalesces simultaneous requests for the same display copy', async () => {
    let finish!: (value: Buffer) => void;
    const generate = vi.fn(() => new Promise<Buffer>(resolve => { finish = resolve; }));
    const first = loadDisplayPhoto('report_photos', 'simultaneous.jpg', 'card', generate);
    const second = loadDisplayPhoto('report_photos', 'simultaneous.jpg', 'card', generate);
    finish(Buffer.from('one download'));
    expect(await first).toEqual(await second);
    expect(generate).toHaveBeenCalledOnce();
  });

  it('does not cache missing or failed sources, and permits a later recovery', async () => {
    const generate = vi.fn()
      .mockRejectedValueOnce(new PhotoSourceError(404, 'Missing'))
      .mockResolvedValueOnce(Buffer.from('recovered'));
    await expect(loadDisplayPhoto('report_photos', 'recover.jpg', 'detail', generate)).rejects.toMatchObject({ status: 404 });
    expect(stored.size).toBe(0);
    await expect(loadDisplayPhoto('report_photos', 'recover.jpg', 'detail', generate)).resolves.toEqual(Buffer.from('recovered'));
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('serves a large display copy unchanged without exceeding the cache size limit', async () => {
    const bytes = Buffer.alloc(1_400_001, 1);
    const generate = vi.fn(async () => bytes);
    expect(await loadDisplayPhoto('report_photos', 'large.jpg', 'detail', generate)).toEqual(bytes);
    expect(stored.size).toBe(0);
    expect(generate).toHaveBeenCalledOnce();
  });

  it('continues serving when the cache cannot be read or written', async () => {
    const generate = vi.fn(async () => Buffer.from('available'));
    cacheFactory.mockImplementationOnce(() => async () => { throw new Error('cache offline'); });
    await expect(loadDisplayPhoto('report_photos', 'cache-offline.jpg', 'card', generate)).resolves.toEqual(Buffer.from('available'));
    cacheFactory.mockImplementationOnce(generateCached => async () => {
      await generateCached();
      throw new Error('cache write failed');
    });
    await expect(loadDisplayPhoto('report_photos', 'cache-write.jpg', 'card', generate)).resolves.toEqual(Buffer.from('available'));
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
