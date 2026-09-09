// Dependency-injected transaction coordinator. Journal writes must complete
// before each remote step so process termination never loses the report ID.
export async function submitRecoverableReport({ journal, persist, reserve, upload, publish, onProgress = () => {} }) {
  await persist(journal);
  onProgress('Saving report details…');
  const existing = await reserve(journal.id, journal.payload);
  if (existing.is_published) return existing;
  const paths = [...(journal.paths || [])];
  for (let index = 0; index < journal.photos.length; index += 1) {
    if (paths[index]) continue;
    onProgress(`Uploading photo ${index + 1} of ${journal.photos.length}…`);
    paths[index] = await upload(journal.photos[index], journal.id);
    await persist({ ...journal, paths });
  }
  if (!paths.length) throw new Error('Add at least one photo before submitting.');
  onProgress('Publishing your report…');
  return publish(journal.id, paths);
}
