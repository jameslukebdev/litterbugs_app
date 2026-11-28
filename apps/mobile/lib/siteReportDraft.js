import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { cloudDrafts } from './cloudDrafts';
import { resumableReportStep } from './reportWizard';

const key = (sourceId, userId) => `litterbugs.site-report-draft.${userId}.${sourceId}`;
const prefix = (sourceId, userId) => `site-report-drafts/${userId}/${sourceId}/`;
function photoUri(sourceId, userId, uri) {
  const folder = prefix(sourceId, userId);
  const marker = `/${folder}`;
  const relative = uri.startsWith(folder) ? uri : uri.startsWith('file:') && uri.includes(marker) ? folder + uri.slice(uri.lastIndexOf(marker) + marker.length) : null;
  return relative && !relative.slice(folder.length).includes('/') && !relative.includes('..') ? `${FileSystem.documentDirectory}${relative}` : uri;
}
// Separate storage and queue: ordinary report completion/discard must not delete
// saved site evidence. Account deletion explicitly drains and clears this store.
let queue = Promise.resolve();
const enqueue = work => { const result = queue.catch(() => {}).then(work); queue = result; return result; };
export const waitForSiteReportDraftWrites = () => queue.catch(() => {});
export function saveSiteReportDraft(sourceId, userId, draft) {
  return enqueue(async () => {
    if (cloudDrafts.isRetired?.(userId)) throw new Error('This account was deleted.');
    const directory = `${FileSystem.documentDirectory}${prefix(sourceId, userId)}`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const photos = [];
    for (const stored of draft.form.photos) {
      const uri = photoUri(sourceId, userId, stored);
      const path = uri.startsWith(directory) ? uri : `${directory}${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, uri)}.jpg`;
      if (!(await FileSystem.getInfoAsync(path)).exists) await FileSystem.copyAsync({ from: uri, to: path });
      photos.push(path.slice(FileSystem.documentDirectory.length));
    }
    await AsyncStorage.setItem(key(sourceId, userId), JSON.stringify({ ...draft, workflowVersion: 2, form: { ...draft.form, photos }, savedAt: Date.now() }));
  });
}
export function loadSiteReportDraft(sourceId, userId) {
  return enqueue(async () => {
    if (cloudDrafts.isRetired?.(userId)) return null;
    const raw = await AsyncStorage.getItem(key(sourceId, userId));
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft?.form || !Number.isFinite(draft.coordinate?.latitude) || !Number.isFinite(draft.coordinate?.longitude)) return null;
    const photos = [];
    for (const stored of draft.form.photos || []) {
      const uri = photoUri(sourceId, userId, stored);
      if ((await FileSystem.getInfoAsync(uri)).exists) photos.push(uri);
    }
    const restored = { ...draft, form: { ...draft.form, photos }, missingPhotoCount: (draft.form.photos || []).length - photos.length };
    return { ...restored, step: resumableReportStep(restored), workflowVersion: 2 };
  });
}
export function clearSiteReportDraft(sourceId, userId) {
  return enqueue(async () => {
    await AsyncStorage.removeItem(key(sourceId, userId));
    await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${prefix(sourceId, userId)}`, { idempotent: true });
  });
}
