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

it('starts the third photo as soon as either slot frees and reports immediate progress', async () => {
  let finishFirst;
  const first = new Promise(resolve => { finishFirst = resolve; });
  const started = [], progress = [];
  const operation = mapInConcurrentBatches([1, 2, 3], async value => {
    started.push(value);
    if (value === 1) await first;
    return value;
  }, { onFulfilled: value => progress.push(value) });
  await vi.waitFor(() => expect(started).toEqual([1, 2, 3]));
  expect(progress).toEqual([2, 3]);
  finishFirst();
  expect(await operation).toEqual([1, 2, 3]);
});

it('drains active uploads after failure before returning evidence for rollback', async () => {
  let finishFirst;
  const first = new Promise(resolve => { finishFirst = resolve; });
  const completed = [];
  let settled = false;
  const operation = mapInConcurrentBatches([1, 2, 3], async value => {
    if (value === 2) throw Error('offline');
    await first;
    return value;
  }, { onFulfilled: value => completed.push(value) }).catch(error => { settled = true; return error; });
  await Promise.resolve();
  await Promise.resolve();
  expect(settled).toBe(false);
  finishFirst();
  expect((await operation).message).toBe('offline');
  expect(completed).toEqual([1]);
});
