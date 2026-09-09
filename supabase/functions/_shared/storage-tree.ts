type Entry = { name: string; id: string | null };
type ListPage = (path: string, options: { limit: number; offset: number; sortBy: { column: string; order: string } }) => Promise<{ data: Entry[] | null; error: unknown }>;

// Collect before deleting: removing a page while advancing offsets skips files.
// Each listing is rooted in the authenticated user's folder supplied by caller.
export async function listStorageTree(list: ListPage, root: string): Promise<string[]> {
  const folders = [root];
  const files: string[] = [];
  for (let index = 0; index < folders.length; index++) {
    const folder = folders[index];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await list(folder, { limit: 500, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error) throw error;
      const page = data || [];
      for (const entry of page) {
        if (!entry.name || entry.name.includes('/') || entry.name === '.' || entry.name === '..') throw new Error('Invalid storage entry');
        const path = `${folder}/${entry.name}`;
        if (entry.id) files.push(path); else folders.push(path);
      }
      if (page.length < 500) break;
    }
  }
  return files;
}
