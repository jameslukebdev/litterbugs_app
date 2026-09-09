import { listStorageTree } from './storage-tree.ts';
const assert = (value: boolean) => { if (!value) throw new Error('Assertion failed'); };
Deno.test('enumerates all pages and nested folders before removal', async () => {
  const items = Array.from({ length: 1105 }, (_, i) => ({ name: `${i}.jpg`, id: `${i}` }));
  const paths = await listStorageTree(async (folder, { offset, limit }) => ({
    data: folder === 'owner' ? [{ name: 'report', id: null }] : items.slice(offset, offset + limit), error: null,
  }), 'owner');
  assert(paths.length === 1105 && paths.every(p => p.startsWith('owner/report/')));
  assert(paths.includes('owner/report/1104.jpg'));
});
Deno.test('fails closed on listing errors and invalid paths', async () => {
  for (const response of [{ data: null, error: new Error('offline') }, { data: [{ name: '../other', id: 'file' }], error: null }]) {
    let failed = false;
    try { await listStorageTree(async () => response, 'owner'); } catch { failed = true; }
    assert(failed);
  }
});
