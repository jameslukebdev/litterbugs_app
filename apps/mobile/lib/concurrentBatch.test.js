import { describe, expect, it, vi } from 'vitest';

import {
  CLEANUP_PHOTO_UPLOAD_CONCURRENCY,
  mapInConcurrentBatches,
  MEDIA_UPLOAD_CONCURRENCY,
  REPORT_PHOTO_UPLOAD_CONCURRENCY,
} from './concurrentBatch';

describe('concurrent batch processing', () => {
  it('processes at most two photos together and preserves their order', async () => {
    let active = 0;
    let maxActive = 0;
    const completed = [];

    const results = await mapInConcurrentBatches(
      [1, 2, 3],
      async (value) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, value === 1 ? 8 : 2));
        active -= 1;
        return value * 10;
      },
      { onFulfilled: (value) => completed.push(value) },
    );

    expect(REPORT_PHOTO_UPLOAD_CONCURRENCY).toBe(2);
    expect(CLEANUP_PHOTO_UPLOAD_CONCURRENCY).toBe(MEDIA_UPLOAD_CONCURRENCY);
    expect(maxActive).toBe(2);
    expect(results).toEqual([10, 20, 30]);
    expect(completed).toHaveLength(3);
  });

  it('waits for the active batch and stops before starting another after failure', async () => {
    const worker = vi.fn(async (value) => {
      if (value === 2) throw new Error('scan failed');
      return value;
    });
    const completed = [];

    await expect(mapInConcurrentBatches(
      [1, 2, 3],
      worker,
      { onFulfilled: (value) => completed.push(value) },
    )).rejects.toThrow('scan failed');

    expect(worker).toHaveBeenCalledTimes(2);
    expect(completed).toEqual([1]);
  });
});
