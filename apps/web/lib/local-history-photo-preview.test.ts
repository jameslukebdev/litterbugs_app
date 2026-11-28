import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
const { readFile, requestHeaders } = vi.hoisted(() => ({ readFile: vi.fn(), requestHeaders: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('node:fs/promises', () => ({ readFile }));
vi.mock('next/headers', () => ({ headers: requestHeaders }));
import { loadLocalHistoryPhotoPreview } from './local-history-photo-preview';
const id = '11111111-1111-4111-8111-111111111111';
const path = 'owner/report/before.jpg';
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('VERCEL', '');
  vi.stubEnv('VERCEL_ENV', '');
  vi.stubEnv('LITTERBUGS_DEPLOYMENT_ENV', '');
  vi.stubEnv('LITTERBUGS_LOCAL_HISTORY_PHOTO_DIR', '/private/local-preview');
  requestHeaders.mockResolvedValue(new Headers({ host: '127.0.0.1:3000' }));
  readFile.mockResolvedValue(Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
});
afterEach(() => vi.unstubAllEnvs());
it('reads only the variant matching the report and current source path', async () => {
  expect(await loadLocalHistoryPhotoPreview(id, path, 640)).toEqual(Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  const key = createHash('sha256').update(`${id}\n${path}`).digest('hex');
  expect(readFile).toHaveBeenCalledWith(`/private/local-preview/${key}-640.jpg`);
});
it.each([
  ['NODE_ENV', 'production'], ['VERCEL', '1'], ['VERCEL_ENV', 'preview'],
  ['LITTERBUGS_DEPLOYMENT_ENV', 'production'], ['LITTERBUGS_LOCAL_HISTORY_PHOTO_DIR', ''],
  ['LITTERBUGS_LOCAL_HISTORY_PHOTO_DIR', 'relative/path'],
])('never reads preview copies when %s is %s', async (key, value) => {
  vi.stubEnv(key, value);
  expect(await loadLocalHistoryPhotoPreview(id, path, 640)).toBeNull();
  expect(readFile).not.toHaveBeenCalled();
});
it('refuses public hosts and forwarded public hosts', async () => {
  for (const headers of [new Headers({ host: 'litterbugs.app' }), new Headers({ host: 'localhost:3000', 'x-forwarded-host': 'litterbugs.app' })]) {
    requestHeaders.mockResolvedValue(headers);
    expect(await loadLocalHistoryPhotoPreview(id, path, 640)).toBeNull();
  }
  expect(readFile).not.toHaveBeenCalled();
});
it('falls back normally for missing or invalid display files', async () => {
  readFile.mockRejectedValueOnce(new Error('Missing'));
  expect(await loadLocalHistoryPhotoPreview(id, path, 640)).toBeNull();
  readFile.mockResolvedValueOnce(Buffer.from('not a JPEG'));
  expect(await loadLocalHistoryPhotoPreview(id, path, 640)).toBeNull();
});
