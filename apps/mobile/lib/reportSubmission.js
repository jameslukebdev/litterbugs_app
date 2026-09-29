import { mapInConcurrentBatches } from './concurrentBatch';

// Dependency-injected transaction coordinator. Journal writes must complete
// before each remote step so process termination never loses the report ID.
export async function submitRecoverableReport({ journal, persist, reserve, upload, publish, onProgress = () => {} }) {
  await persist(journal);
  onProgress('Saving report details…');
  const existing = await reserve(journal.id, journal.payload);
  if (existing.is_published) return existing;
  const paths = [...(journal.paths || [])];
  let completed = paths.filter(Boolean).length;
  let writes = Promise.resolve();
  onProgress(`Uploading and checking ${journal.photos.length} photos…`);
  await mapInConcurrentBatches(journal.photos, async (photo, index) => {
    if (paths[index]) return;
    const path = await upload(photo, journal.id);
    paths[index] = path;
    // Snapshot and serialize journal writes: a slower write must never erase
    // another photo's durable progress. Retry uploads only missing paths.
    const snapshot = { ...journal, paths: [...paths] };
    writes = writes.then(() => persist(snapshot));
    await writes;
    completed += 1;
    onProgress(`Photo ${completed} of ${journal.photos.length} safety-checked.`);
  });
  if (!paths.length) throw new Error('Add at least one photo before submitting.');
  onProgress('Publishing your report…');
  return publish(journal.id, paths);
}
