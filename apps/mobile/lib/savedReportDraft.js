import { resumableReportStep } from './reportWizard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
const key = (userId) => `litterbugs.report-draft.${userId}`;
// Serialize copies/writes/deletes so closing a wizard cannot resurrect a discarded draft.
let queue = Promise.resolve();
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
    for (const uri of draft.form.photos) {
      const path = uri.startsWith(directory)
        ? uri
        : `${directory}${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, uri)}.jpg`;
      if (!(await FileSystem.getInfoAsync(path)).exists)
        await FileSystem.copyAsync({ from: uri, to: path });
      photos.push(path);
    }
    await AsyncStorage.setItem(
      key(userId),
      JSON.stringify({
        ...draft,
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
    for (const uri of draft.form.photos || [])
      if ((await FileSystem.getInfoAsync(uri)).exists) photos.push(uri);
    const restored = { ...draft, form: { ...draft.form, photos }, missingPhotoCount: (draft.form.photos || []).length - photos.length };
    return { ...restored, step: resumableReportStep(restored) };
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
