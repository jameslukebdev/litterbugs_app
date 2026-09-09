import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
const key = (userId, cleanupId) => `litterbugs.cleanup-draft.${userId}.${cleanupId}`;
const directory = (userId, cleanupId) => `${FileSystem.documentDirectory}cleanup-drafts/${userId}/${cleanupId}/`;
let queue = Promise.resolve();
const enqueue = work => { const result = queue.catch(() => {}).then(work); queue = result; return result; };
export function saveCleanupDraft(userId, cleanupId, draft) {
  return enqueue(async () => {
    const folder = directory(userId, cleanupId);
    await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
    const photos = [];
    for (const photo of draft.photos) {
      const uri = photo.uri.startsWith(folder) ? photo.uri : `${folder}${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, photo.uri)}.jpg`;
      if (!(await FileSystem.getInfoAsync(uri)).exists) await FileSystem.copyAsync({ from: photo.uri, to: uri });
      photos.push({ ...photo, uri });
    }
    await AsyncStorage.setItem(key(userId, cleanupId), JSON.stringify({ ...draft, photos, savedAt: Date.now() }));
  });
}
export function loadCleanupDraft(userId, cleanupId) {
  return enqueue(async () => {
    const raw = await AsyncStorage.getItem(key(userId, cleanupId));
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!Array.isArray(draft?.photos) || typeof draft.description !== 'string') return null;
    const photos = [];
    for (const photo of draft.photos) if (typeof photo?.uri === 'string' && (await FileSystem.getInfoAsync(photo.uri)).exists) photos.push(photo);
    return { ...draft, photos, missingPhotoCount: draft.photos.length - photos.length };
  });
}
export function clearCleanupDraft(userId, cleanupId) {
  return enqueue(async () => {
    await AsyncStorage.removeItem(key(userId, cleanupId));
    await FileSystem.deleteAsync(directory(userId, cleanupId), { idempotent: true });
  });
}
