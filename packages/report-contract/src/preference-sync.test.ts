import { expect, it, vi } from 'vitest';
import { createPreferenceSync, type SyncedPreferences } from './preference-sync';
const report = '11111111-1111-4111-8111-111111111111';
const owner = '22222222-2222-4222-8222-222222222222';
function fixture(nonBlockingSync = false) {
  const storage = new Map<string, string>();
  const state: SyncedPreferences = { favorites: [], hidden: [] };
  const seen = new Set<string>();
  let offline = false; let lostResponse = false; let id = 0;
  const client = createPreferenceSync({
    nonBlockingSync,
    read: async key => storage.get(key) ?? null,
    write: async (key, value) => { storage.set(key, value); },
    legacy: async () => ({ favorites: [report], hidden: [] }),
    id: () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
    remote: async (_owner, seed, operations) => {
      if (offline) throw new Error('Offline');
      for (const item of seed) { if (!seen.has(`seed:${item.kind}:${item.reportId}`)) state[item.kind] = [...new Set([...state[item.kind], item.reportId])]; }
      for (const item of operations) {
        if (seen.has(item.id)) continue;
        seen.add(item.id); seen.add(`seed:${item.kind}:${item.reportId}`);
        state[item.kind] = item.enabled ? [...new Set([...state[item.kind], item.reportId])] : state[item.kind].filter(id => id !== item.reportId);
      }
      if (lostResponse) { lostResponse = false; throw new Error('Response lost'); }
      return structuredClone(state);
    },
  });
  return { client, state, storage, offline: (value: boolean) => { offline = value; }, loseResponse: () => { lostResponse = true; } };
}
it('migrates local favorites, preserves offline removal across reload, and syncs both fields', async () => {
  const f = fixture();
  await f.client.sync(owner); f.offline(true);
  await f.client.set(owner, 'favorites', report, false);
  await f.client.set(owner, 'hidden', report, true);
  expect((await f.client.sync(owner)).offline).toBe(true);
  expect((await f.client.load(owner)).preferences).toEqual({ favorites: [], hidden: [report] });
  f.offline(false);
  expect(await f.client.sync(owner)).toEqual({ preferences: { favorites: [], hidden: [report] }, pending: false, offline: false });
});
it.each([false, true])('does not replay a lost-response operation over a newer device change (background=%s)', async background => {
  const f = fixture(background); await f.client.sync(owner);
  await f.client.set(owner, 'favorites', report, false); f.loseResponse();
  expect((await f.client.sync(owner)).pending).toBe(true);
  f.state.favorites = [report]; // another device re-adds after the removal committed
  expect((await f.client.sync(owner)).preferences.favorites).toEqual([report]);
});
it('keeps guests and account outboxes isolated and refuses corrupt state', async () => {
  const f = fixture();
  await f.client.set('guest', 'hidden', report, true);
  expect((await f.client.load(owner)).preferences.hidden).toEqual([]);
  expect((await f.client.sync('guest')).pending).toBe(false);
  f.storage.set(owner, '{');
  await expect(f.client.set(owner, 'favorites', report, false)).rejects.toThrow();
  expect(f.storage.get(owner)).toBe('{');
});
it.each([false, true])('serializes overlapping changes without dropping an operation (background=%s)', async background => {
  const f = fixture(background);
  await Promise.all([f.client.sync(owner), f.client.set(owner, 'favorites', report, false), f.client.set(owner, 'hidden', report, true), f.client.sync(owner)]);
  expect((await f.client.load(owner)).preferences).toEqual({ favorites: [], hidden: [report] });
});

function backgroundFixture() {
  const storage = new Map<string, string>();
  let sequence = 0;
  const remote = vi.fn<Parameters<typeof createPreferenceSync>[0]['remote']>();
  const client = createPreferenceSync({
    nonBlockingSync: true,
    read: async key => storage.get(key) ?? null,
    write: async (key, value) => { storage.set(key, value); },
    legacy: async () => ({ favorites: [], hidden: [] }),
    id: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
    remote,
  });
  return { client, remote, storage };
}
it('saves locally during a slow sync and preserves the later edit when the old response arrives', async () => {
  const { client, remote } = backgroundFixture();
  let respond!: (preferences: SyncedPreferences) => void;
  remote.mockImplementationOnce(() => new Promise(resolve => { respond = resolve; }))
    .mockResolvedValueOnce({ favorites: [report], hidden: [] });
  const sync = client.sync(owner);
  await vi.waitFor(() => expect(remote).toHaveBeenCalledOnce());
  const saved = await client.set(owner, 'favorites', report, true);
  expect(saved.preferences.favorites).toEqual([report]);
  expect((await client.load(owner)).preferences.favorites).toEqual([report]);
  // A concurrent caller shares the same network flush rather than starting another.
  expect(client.sync(owner)).toBe(sync);
  respond({ favorites: [], hidden: [] });
  expect((await sync).preferences.favorites).toEqual([report]);
  expect(remote).toHaveBeenCalledTimes(2);
  expect(remote.mock.calls[1][2]).toEqual([expect.objectContaining({ kind: 'favorites', reportId: report, enabled: true })]);
});
it('keeps newer local changes queued when an in-flight sync fails', async () => {
  const { client, remote } = backgroundFixture();
  let fail!: (error: Error) => void;
  remote.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }));
  const sync = client.sync(owner);
  await vi.waitFor(() => expect(remote).toHaveBeenCalledOnce());
  await client.set(owner, 'hidden', report, true);
  fail(new Error('Offline'));
  expect(await sync).toMatchObject({ preferences: { favorites: [], hidden: [report] }, pending: true, offline: true });
  remote.mockResolvedValueOnce({ favorites: [], hidden: [report] });
  expect(await client.sync(owner)).toMatchObject({ pending: false, offline: false });
});
it('does not recreate retired preferences when a late network response returns', async () => {
  const { client, remote, storage } = backgroundFixture();
  let respond!: (preferences: SyncedPreferences) => void;
  remote.mockImplementationOnce(() => new Promise(resolve => { respond = resolve; }));
  const sync = client.sync(owner);
  const failed = expect(sync).rejects.toThrow('deleted');
  await vi.waitFor(() => expect(remote).toHaveBeenCalledOnce());
  await client.retire(owner);
  respond({ favorites: [report], hidden: [] });
  await failed;
  expect(storage.get(owner)).toBe('');
});
it('orders syncs across tabs using a separate lock while either tab can save locally', async () => {
  const storage = new Map<string, string>();
  const locks = new Map<string, Promise<unknown>>();
  const lock = <T>(key: string, work: () => Promise<T>): Promise<T> => {
    const next = (locks.get(key) ?? Promise.resolve()).catch(() => {}).then(work);
    locks.set(key, next); return next;
  };
  let release!: () => void;
  const paused = new Promise<void>(resolve => { release = resolve; });
  const server: SyncedPreferences = { favorites: [], hidden: [] };
  let sequence = 0;
  const remote = vi.fn<Parameters<typeof createPreferenceSync>[0]['remote']>().mockImplementation(async (_owner, _seed, operations) => {
    if (remote.mock.calls.length === 1) await paused;
    for (const op of operations) server[op.kind] = op.enabled ? [...new Set([...server[op.kind], op.reportId])] : server[op.kind].filter(id => id !== op.reportId);
    return structuredClone(server);
  });
  const adapter: Parameters<typeof createPreferenceSync>[0] = {
    nonBlockingSync: true,
    read: async key => storage.get(key) ?? null,
    write: async (key, value) => { storage.set(key, value); },
    legacy: async () => ({ favorites: [], hidden: [] }), remote,
    id: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
    exclusive: (key, work) => lock(`data:${key}`, work),
    exclusiveSync: (key, work) => lock(`network:${key}`, work),
  };
  const first = createPreferenceSync(adapter), second = createPreferenceSync(adapter);
  const firstSync = first.sync(owner);
  await vi.waitFor(() => expect(remote).toHaveBeenCalledOnce());
  const secondSync = second.sync(owner);
  expect((await second.set(owner, 'favorites', report, true)).preferences.favorites).toEqual([report]);
  expect(remote).toHaveBeenCalledOnce();
  release();
  const results = await Promise.all([firstSync, secondSync]);
  expect(results.every(result => result.preferences.favorites.includes(report))).toBe(true);
  expect((await first.load(owner)).preferences.favorites).toEqual([report]);
});
