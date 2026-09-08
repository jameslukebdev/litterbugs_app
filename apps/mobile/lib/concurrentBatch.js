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
  const batchSize = Math.max(1, Math.floor(concurrency));
  const results = new Array(items.length);

  for (let start = 0; start < items.length; start += batchSize) {
    const entries = items
      .slice(start, start + batchSize)
      .map((item, offset) => ({ item, index: start + offset }));
    const settled = await Promise.allSettled(
      entries.map(({ item, index }) => worker(item, index)),
    );
    let batchError = null;

    settled.forEach((result, offset) => {
      const { index } = entries[offset];
      if (result.status === 'fulfilled') {
        results[index] = result.value;
        onFulfilled(result.value, index);
      } else if (!batchError) {
        batchError = result.reason;
      }
    });

    if (batchError) throw batchError;
  }

  return results;
}
