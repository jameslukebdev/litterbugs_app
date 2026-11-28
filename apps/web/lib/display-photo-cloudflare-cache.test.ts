import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const { writes } = vi.hoisted(() => ({ writes: [] as Promise<unknown>[] }));
vi.mock('server-only', () => ({}));
vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: () => ({ ctx: { waitUntil: (write: Promise<unknown>) => writes.push(write) } }) }));
vi.mock('next/cache', () => ({ unstable_cache: () => { throw new Error('Node cache must not be used'); } }));
import { loadDisplayPhoto } from './display-photo-cache';
let stored: Map<string, Response>;
let cache: { match: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> };
beforeEach(() => {
  vi.stubEnv('LITTERBUGS_IMAGE_RUNTIME', 'cloudflare'); stored = new Map(); writes.length = 0;
  cache = { match: vi.fn(async (request: Request) => stored.get(request.url)?.clone()),
    put: vi.fn(async (request: Request, response: Response) => { stored.set(request.url, response.clone()); }) };
  vi.stubGlobal('caches', { open: vi.fn(async (name: string) => { expect(name).toBe('litterbugs-display-photos-v2'); return cache; }) });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('reuses encoded bytes in an internal named cache with hashed, credential-free keys', async () => {
  const generate = vi.fn(async () => Buffer.from('photo'));
  await loadDisplayPhoto('report_photos','private/owner/path.jpg','detail',generate); await Promise.all(writes);
  expect(await loadDisplayPhoto('report_photos','private/owner/path.jpg','detail',generate)).toEqual(Buffer.from('photo'));
  expect(generate).toHaveBeenCalledOnce();
  expect([...stored.keys()][0]).toMatch(/^https:\/\/display-photo-cache\.invalid\/v2\/[a-f0-9]{64}$/);
});
it('does not cache failed generation and still serves bytes when cache writes fail', async () => {
  const generate = vi.fn().mockRejectedValueOnce(new Error('source unavailable')).mockResolvedValue(Buffer.from('recovered'));
  await expect(loadDisplayPhoto('report_photos','retry.jpg','detail',generate)).rejects.toThrow('source unavailable');
  expect(cache.put).not.toHaveBeenCalled();
  cache.put.mockRejectedValueOnce(new Error('cache offline'));
  expect(await loadDisplayPhoto('report_photos','retry.jpg','detail',generate)).toEqual(Buffer.from('recovered'));
  await Promise.all(writes); expect(generate).toHaveBeenCalledTimes(2);
});
it('preserves the byte-size limit and separates path, bucket and variant', async () => {
  const large = vi.fn(async () => Buffer.alloc(1_400_001));
  expect((await loadDisplayPhoto('report_photos','large.jpg','detail',large)).length).toBe(1_400_001);
  expect(cache.put).not.toHaveBeenCalled();
  const generate = vi.fn(async () => Buffer.from('photo'));
  for (const [bucket,path,variant] of [['report_photos','one.jpg','card'],['cleanup_photos','one.jpg','card'],['report_photos','one.jpg','detail']] as const) {
    await loadDisplayPhoto(bucket,path,variant,generate); await Promise.all(writes);
  }
  expect(stored.size).toBe(3);
});
