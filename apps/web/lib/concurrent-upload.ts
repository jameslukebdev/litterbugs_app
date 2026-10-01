/** Drain active uploads before rejecting so rollback cannot race an in-flight upload. */
export async function uploadConcurrently<T, R>(
  items: T[],
  upload: (item: T, index: number) => Promise<R>,
  onUploaded: (result: R, index: number) => void,
) {
  const results: R[] = new Array(items.length);
  let next = 0;
  let failed = false;
  let failure: unknown;
  const worker = async () => {
    while (!failed && next < items.length) {
      const index = next++;
      try {
        results[index] = await upload(items[index], index);
        onUploaded(results[index], index);
      } catch (error) {
        if (!failed) failure = error;
        failed = true;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(2, items.length) }, worker));
  if (failed) throw failure;
  return results;
}
