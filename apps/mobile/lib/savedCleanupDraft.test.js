import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  copyAsync: async ({ to }) => {
    if (m.copyFails) throw Error('interrupted');
    m.files.add(to);
  },
  deleteAsync: async (p) => {
    for (const file of m.files) if (file.startsWith(p)) m.files.delete(file);
  },
}));
import {
  saveCleanupDraft,
  loadCleanupDraft,
  clearCleanupDraft,
} from './savedCleanupDraft';
const draft = {
  description: 'Removed bottles', photos: [{ uri: 'file://source.jpg', mimeType: 'image/jpeg' }], submissionId: 'stable-id',
};
describe('durable report drafts', () => {
  beforeEach(() => {
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
});
