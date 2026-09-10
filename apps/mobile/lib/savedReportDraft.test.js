import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  storage: new Map(),
  files: new Set(['file://source.jpg']),
  copyFails: false,
}));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: async (k, v) => m.storage.set(k, v),
    getItem: async (k) => m.storage.get(k),
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
  saveReportDraft,
  loadReportDraft,
  clearReportDraft,
} from './savedReportDraft';
const draft = {
  coordinate: { latitude: 36, longitude: -81 },
  form: { title: 'Bottles', photos: ['file://source.jpg'] },
  step: 2,
};
beforeEach(() => {
    m.storage.clear();
    m.files = new Set(['file://source.jpg']);
    m.copyFails = false;
  });
describe('durable report drafts', () => {
  it('retains evidence after temporary picker photos disappear', async () => {
    await saveReportDraft('alice', draft);
    m.files.delete('file://source.jpg');
    const restored = await loadReportDraft('alice');
    expect(restored.form.title).toBe('Bottles');
    expect(restored.form.photos).toEqual([
      'file://documents/report-drafts/alice/photo-hash.jpg',
    ]);
    expect(await loadReportDraft('bob')).toBeNull();
  });
  it('does not overwrite a previous good draft after an interrupted photo copy', async () => {
    await saveReportDraft('alice', {
      ...draft,
      form: { title: 'Saved', photos: [] },
    });
    m.copyFails = true;
    await expect(saveReportDraft('alice', draft)).rejects.toThrow(
      'interrupted',
    );
    expect((await loadReportDraft('alice')).form.title).toBe('Saved');
  });
  it('serializes discard after pending autosave so the draft cannot reappear', async () => {
    const save = saveReportDraft('alice', draft);
    const discard = clearReportDraft('alice');
    await Promise.all([save, discard]);
    expect(await loadReportDraft('alice')).toBeNull();
  });
});

it('stores relative photo paths and resolves them in the current container', async () => {
  await saveReportDraft('alice', draft);
  const stored = JSON.parse(m.storage.get('litterbugs.report-draft.alice'));
  expect(stored.form.photos).toEqual(['report-drafts/alice/photo-hash.jpg']);
  const restored = await loadReportDraft('alice');
  expect(restored.form.photos).toEqual(['file://documents/report-drafts/alice/photo-hash.jpg']);
});

it('recovers old absolute paths after an iOS container relocation', async () => {
  m.files.add('file://documents/report-drafts/alice/old-photo.jpg');
  m.storage.set('litterbugs.report-draft.alice', JSON.stringify({
    ...draft, form: { ...draft.form, photos: ['file:///old-container/Documents/report-drafts/alice/old-photo.jpg'] },
  }));
  const restored = await loadReportDraft('alice');
  expect(restored.missingPhotoCount).toBe(0);
  expect(restored.form.photos).toEqual(['file://documents/report-drafts/alice/old-photo.jpg']);
  await saveReportDraft('alice', restored);
  expect(JSON.parse(m.storage.get('litterbugs.report-draft.alice')).form.photos).toEqual(['report-drafts/alice/old-photo.jpg']);
});

it('still reports genuinely missing photos without losing the other answers', async () => {
  m.storage.set('litterbugs.report-draft.alice', JSON.stringify({
    ...draft, form: { ...draft.form, photos: ['report-drafts/alice/missing.jpg'] },
  }));
  const restored = await loadReportDraft('alice');
  expect(restored.missingPhotoCount).toBe(1);
  expect(restored.form.title).toBe('Bottles');
  expect(restored.step).toBe(0);
});
