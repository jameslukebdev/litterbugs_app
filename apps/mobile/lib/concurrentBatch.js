export const MEDIA_UPLOAD_CONCURRENCY = 2;
export const REPORT_PHOTO_UPLOAD_CONCURRENCY = MEDIA_UPLOAD_CONCURRENCY;
export const CLEANUP_PHOTO_UPLOAD_CONCURRENCY = MEDIA_UPLOAD_CONCURRENCY;

export async function mapInConcurrentBatches(
  items,
  worker,
  {
    concurrency = REPORT_PHOTO_UPLOAD_CONCURRENCY,
    onFulfilled = () => {},
  } = {},
) {
  const workerCount = Number.isFinite(concurrency) ? Math.max(1, Math.floor(concurrency)) : 1;
  const results = new Array(items.length);
  let nextIndex = 0;
  let failed = false;
  let firstError;

  // Keep each slot busy without waiting for a slower photo in the same batch.
  // Drain active work before rejecting so callers can safely clean up uploads.
  const run = async () => {
    while (!failed && nextIndex < items.length) {
      const index = nextIndex++;
      try {
        const value = await worker(items[index], index);
        results[index] = value;
        await onFulfilled(value, index);
      } catch (error) {
        if (!failed) firstError = error;
        failed = true;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(workerCount, items.length) }, run));
  if (failed) throw firstError;
  return results;
}
