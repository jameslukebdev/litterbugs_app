import { expect, it } from 'vitest';
import { createPreferenceSync, type SyncedPreferences } from './preference-sync';
const report = '11111111-1111-4111-8111-111111111111';
const owner = '22222222-2222-4222-8222-222222222222';
function fixture() {
  const storage = new Map<string, string>();
  const state: SyncedPreferences = { favorites: [], hidden: [] };
  const seen = new Set<string>();
  let offline = false; let lostResponse = false; let id = 0;
  const client = createPreferenceSync({
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
it('does not replay a lost-response operation over a newer device change', async () => {
  const f = fixture(); await f.client.sync(owner);
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
it('serializes overlapping changes without dropping an operation', async () => {
  const f = fixture();
  await Promise.all([f.client.sync(owner), f.client.set(owner, 'favorites', report, false), f.client.set(owner, 'hidden', report, true), f.client.sync(owner)]);
  expect((await f.client.load(owner)).preferences).toEqual({ favorites: [], hidden: [report] });
});
