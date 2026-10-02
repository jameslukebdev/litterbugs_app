import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./cloudDrafts', () => ({ cloudDrafts: {
  load: vi.fn(), discard: vi.fn(), schedule: vi.fn(), isRetired: () => false,
} }));
const m = vi.hoisted(() => ({
  storage: new Map(),
  files: new Set(['file://source.jpg']),
  copyFails: false,
  readFails: false,
}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: async (k, v) => m.storage.set(k, v),
    getItem: async (k) => { if (m.readFails) throw Error('read interrupted'); return m.storage.get(k); },
    removeItem: async (k) => m.storage.delete(k),
  },
}));
vi.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'sha' },
  digestStringAsync: async () => 'photo-hash',
}));
vi.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file://documents/',
  makeDirectoryAsync: async () => {},
  getInfoAsync: async (p) => ({ exists: m.files.has(p) }),
  copyAsync: async ({ from, to }) => {
    if (m.copyFails) throw Error('interrupted');
    if (!m.files.has(from)) throw Error('Source photo missing');
    m.files.add(to);
  },
  deleteAsync: async (p) => {
    for (const file of m.files) if (file.startsWith(p)) m.files.delete(file);
  },
}));
import {
  saveLocalCleanupDraft as saveCleanupDraft,
  loadLocalCleanupDraft as loadCleanupDraft,
  clearLocalCleanupDraft as clearCleanupDraft,
  loadCleanupDraft as loadAccountCleanupDraft,
} from './savedCleanupDraft';
import { cloudDrafts } from './cloudDrafts';
const draft = {
  description: 'Removed bottles', photos: [{ uri: 'file://source.jpg', mimeType: 'image/jpeg' }], submissionId: 'stable-id',
};
describe('durable report drafts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.storage.clear();
    m.files = new Set(['file://source.jpg']);
    m.copyFails = false;
    m.readFails = false;
  });
  it('retains evidence after temporary picker photos disappear', async () => {
    await saveCleanupDraft('alice', 'cleanup-1', draft);
    m.files.delete('file://source.jpg');
    const restored = await loadCleanupDraft('alice', 'cleanup-1');
    expect(restored.description).toBe('Removed bottles');
    expect(restored.photos.map(p => p.uri)).toEqual([
      'file://documents/cleanup-drafts/alice/cleanup-1/photo-hash.jpg',
    ]);
    expect(await loadCleanupDraft('bob', 'cleanup-1')).toBeNull();
    expect(await loadCleanupDraft('alice', 'cleanup-2')).toBeNull();
    expect(restored.submissionId).toBe('stable-id');
  });
  it('stores portable photo paths instead of the current iOS container', async () => {
    await saveCleanupDraft('alice', 'cleanup-1', draft);
    const stored = JSON.parse(m.storage.get('litterbugs.cleanup-draft.alice.cleanup-1'));
    expect(stored.photos[0]).toEqual({ uri: 'cleanup-drafts/alice/cleanup-1/photo-hash.jpg', mimeType: 'image/jpeg' });
    expect((await loadCleanupDraft('alice', 'cleanup-1')).photos[0].uri).toBe('file://documents/cleanup-drafts/alice/cleanup-1/photo-hash.jpg');
  });
  it('recovers legacy cleanup photos after iOS relocates the app container', async () => {
    const current = 'file://documents/cleanup-drafts/alice/cleanup-1/legacy.jpg';
    const old = 'file:///old-container/Documents/cleanup-drafts/alice/cleanup-1/legacy.jpg';
    m.files = new Set([current]);
    m.storage.set('litterbugs.cleanup-draft.alice.cleanup-1', JSON.stringify({ ...draft, photos: [{ uri: old, mimeType: 'image/jpeg' }] }));
    const restored = await loadCleanupDraft('alice', 'cleanup-1');
    expect(restored.photos).toEqual([{ uri: current, mimeType: 'image/jpeg' }]);
    expect(restored.missingPhotoCount).toBe(0);
    expect(restored.submissionId).toBe('stable-id');
    await saveCleanupDraft('alice', 'cleanup-1', { ...draft, photos: [{ uri: old, mimeType: 'image/jpeg' }] });
    expect((await loadCleanupDraft('alice', 'cleanup-1')).photos[0].uri).toBe(current);
  });
  it('does not relocate paths from a different owner, cleanup, or nested directory', async () => {
    m.files = new Set(['file://documents/cleanup-drafts/alice/cleanup-1/legacy.jpg']);
    for (const uri of ['file:///old/Documents/cleanup-drafts/bob/cleanup-1/legacy.jpg', 'file:///old/Documents/cleanup-drafts/alice/cleanup-2/legacy.jpg', 'cleanup-drafts/alice/cleanup-1/../legacy.jpg']) {
      m.storage.set('litterbugs.cleanup-draft.alice.cleanup-1', JSON.stringify({ ...draft, photos: [{ uri }] }));
      expect((await loadCleanupDraft('alice', 'cleanup-1')).photos).toEqual([]);
    }
  });
  it('does not overwrite a previous good draft after an interrupted photo copy', async () => {
    await saveCleanupDraft('alice', 'cleanup-1', {
      ...draft,
      description: 'Saved', photos: [],
    });
    m.copyFails = true;
    await expect(saveCleanupDraft('alice', 'cleanup-1', draft)).rejects.toThrow(
      'interrupted',
    );
    expect((await loadCleanupDraft('alice', 'cleanup-1')).description).toBe('Saved');
  });
  it('serializes discard after pending autosave so the draft cannot reappear', async () => {
    const save = saveCleanupDraft('alice', 'cleanup-1', draft);
    const discard = clearCleanupDraft('alice', 'cleanup-1');
    await Promise.all([save, discard]);
    expect(await loadCleanupDraft('alice', 'cleanup-1')).toBeNull();
  });
  it('restores the same evidence after a failed read is retried', async () => {
    await saveCleanupDraft('alice', 'cleanup-1', draft);
    m.readFails = true;
    await expect(loadCleanupDraft('alice', 'cleanup-1')).rejects.toThrow('read interrupted');
    m.readFails = false;
    const restored = await loadCleanupDraft('alice', 'cleanup-1');
    expect(restored.description).toBe(draft.description);
    expect(restored.photos).toHaveLength(1);
    expect(restored.submissionId).toBe('stable-id');
  });
  it('explains missing evidence while keeping answers and the submission identity', async () => {
    await saveCleanupDraft('alice', 'cleanup-1', draft);
    m.files.clear();
    const restored = await loadCleanupDraft('alice', 'cleanup-1');
    expect(restored.missingPhotoCount).toBe(1);
    expect(restored.photos).toEqual([]);
    expect(restored.description).toBe(draft.description);
    expect(restored.submissionId).toBe(draft.submissionId);
  });
  it('keeps the actual photo files when reopening evidence for a new correction window', async () => {
    await saveCleanupDraft('alice', 'cleanup-1', { ...draft, correctionDueAt: null });
    m.files.delete('file://source.jpg');
    cloudDrafts.load.mockResolvedValue(await loadCleanupDraft('alice', 'cleanup-1'));
    cloudDrafts.discard.mockImplementation(async (owner, cleanupKey, options) => {
      if (!options?.preserveLocal) await clearCleanupDraft(owner, cleanupKey.slice(8));
    });
    const due = '2026-10-03T16:00:00Z';
    const updated = await loadAccountCleanupDraft('alice', 'cleanup-1', due);
    expect(updated.submissionId).toBeUndefined();
    expect(updated.correctionDueAt).toBe(due);
    expect(updated.photos).toHaveLength(1);
    expect(m.files.has(updated.photos[0].uri)).toBe(true);
    expect((await loadCleanupDraft('alice', 'cleanup-1')).photos).toHaveLength(1);
    expect(cloudDrafts.schedule).toHaveBeenCalledWith('alice', 'cleanup:cleanup-1');
  });
});
