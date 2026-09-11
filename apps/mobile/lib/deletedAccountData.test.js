import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ storage: new Map(), files: new Set(), fail: false, drain: Promise.resolve() }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {
  setItem: async (k, v) => m.storage.set(k, v),
  getAllKeys: async () => [...m.storage.keys()],
  multiRemove: async keys => keys.forEach(k => m.storage.delete(k)),
  removeItem: async k => m.storage.delete(k),
} }));
vi.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file://documents/',
  deleteAsync: async prefix => {
    if (m.fail) throw Error('Disk unavailable');
    for (const path of m.files) if (path.startsWith(prefix)) m.files.delete(path);
  },
}));
vi.mock('./savedReportDraft', () => ({ waitForReportDraftWrites: () => m.drain }));
vi.mock('./savedCleanupDraft', () => ({ waitForCleanupDraftWrites: async () => {} }));
vi.mock('./reportFavorites', () => ({ waitForFavoriteWrites: async () => {} }));
import { clearDeletedAccountData, retryDeletedAccountDataCleanup } from './deletedAccountData';
beforeEach(() => { m.storage.clear(); m.files.clear(); m.fail = false; m.drain = Promise.resolve(); });

it('removes all deleted-account drafts and preserves another account and device preferences', async () => {
  const own = ['litterbugs.report-draft.alice', 'litterbugs.report-submission.alice', 'litterbugs.report-favorites.v1.alice', 'litterbugs.cleanup-draft.alice.one', 'cleanup-review:alice:one:two', 'payment-check:v1:alice:one'];
  const other = ['litterbugs.report-draft.alice2', 'litterbugs.cleanup-draft.alice2.one', 'cleanup-review:alice2:one:two', 'litterbugs.welcome-seen.v1'];
  [...own, ...other].forEach(k => m.storage.set(k, 'saved'));
  ['report-drafts/alice/a.jpg', 'cleanup-drafts/alice/one/a.jpg', 'report-drafts/alice2/a.jpg'].forEach(p => m.files.add(`file://documents/${p}`));
  await clearDeletedAccountData('alice');
  expect([...m.storage.keys()]).toEqual(other);
  expect([...m.files]).toEqual(['file://documents/report-drafts/alice2/a.jpg']);
});

it('drains an outstanding draft save before removing its files', async () => {
  let finish;
  m.drain = new Promise(resolve => { finish = resolve; });
  const deleting = clearDeletedAccountData('alice');
  await Promise.resolve();
  m.storage.set('litterbugs.report-draft.alice', 'late draft');
  m.files.add('file://documents/report-drafts/alice/late.jpg');
  finish();
  await deleting;
  expect(m.storage.size).toBe(0);
  expect(m.files.size).toBe(0);
});

it('retains a retry journal after disk failure and removes it on next launch', async () => {
  m.fail = true;
  m.files.add('file://documents/cleanup-drafts/alice/one/photo.jpg');
  await expect(clearDeletedAccountData('alice')).rejects.toThrow('Disk unavailable');
  expect(m.storage.has('litterbugs.deleted-account-cleanup.alice')).toBe(true);
  m.fail = false;
  await retryDeletedAccountDataCleanup();
  expect(m.storage.size).toBe(0);
  expect(m.files.size).toBe(0);
});

it('rejects missing or path-like account identifiers without deleting files', async () => {
  for (const id of [undefined, '', '../alice', 'alice/bob']) {
    await expect(clearDeletedAccountData(id)).rejects.toThrow('Invalid account');
  }
  expect(m.storage.size).toBe(0);
});
