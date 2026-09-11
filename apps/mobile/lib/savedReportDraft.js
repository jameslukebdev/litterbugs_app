import { resumableReportStep } from './reportWizard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
const key = (userId) => `litterbugs.report-draft.${userId}`;
// Store paths relative to Documents: iOS can relocate an app container on update.
function draftPhotoUri(userId, uri) {
  const prefix = `report-drafts/${userId}/`;
  const marker = `/${prefix}`;
  const relative = uri.startsWith(prefix)
    ? uri
    : uri.startsWith('file:') && uri.includes(marker)
      ? prefix + uri.slice(uri.lastIndexOf(marker) + marker.length)
      : null;
  if (relative && !relative.slice(prefix.length).includes('/') && !relative.includes('..')) {
    return `${FileSystem.documentDirectory}${relative}`;
  }
  return uri;
}
// Serialize copies/writes/deletes so closing a wizard cannot resurrect a discarded draft.
let queue = Promise.resolve();
export const waitForReportDraftWrites = () => queue.catch(() => {});
const enqueue = (work) => {
  const result = queue.catch(() => {}).then(work);
  queue = result;
  return result;
};
export function saveReportDraft(userId, draft) {
  return enqueue(async () => {
    const directory = `${FileSystem.documentDirectory}report-drafts/${userId}/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const photos = [];
    for (const storedUri of draft.form.photos) {
      const uri = draftPhotoUri(userId, storedUri);
      const path = uri.startsWith(directory)
        ? uri
        : `${directory}${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, uri)}.jpg`;
      if (!(await FileSystem.getInfoAsync(path)).exists)
        await FileSystem.copyAsync({ from: uri, to: path });
      photos.push(path.slice(FileSystem.documentDirectory.length));
    }
    await AsyncStorage.setItem(
      key(userId),
      JSON.stringify({
        ...draft,
        workflowVersion: 2,
        form: { ...draft.form, photos },
        savedAt: Date.now(),
      }),
    );
  });
}
export function loadReportDraft(userId) {
  return enqueue(async () => {
    const raw = await AsyncStorage.getItem(key(userId));
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (
      !draft?.form ||
      !Number.isFinite(draft.coordinate?.latitude) ||
      !Number.isFinite(draft.coordinate?.longitude)
    )
      return null;
    const photos = [];
    for (const storedUri of draft.form.photos || []) {
      const uri = draftPhotoUri(userId, storedUri);
      if ((await FileSystem.getInfoAsync(uri)).exists) photos.push(uri);
    }
    const restored = { ...draft, form: { ...draft.form, photos }, missingPhotoCount: (draft.form.photos || []).length - photos.length };
    return { ...restored, step: resumableReportStep(restored), workflowVersion: 2 };
  });
}
export function clearReportDraft(userId) {
  return enqueue(async () => {
    await AsyncStorage.removeItem(key(userId));
    await AsyncStorage.removeItem(`litterbugs.report-submission.${userId}`);
    await FileSystem.deleteAsync(
      `${FileSystem.documentDirectory}report-drafts/${userId}/`,
      { idempotent: true },
    );
  });
}
