import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { waitForReportDraftWrites } from './savedReportDraft';
import { waitForCleanupDraftWrites } from './savedCleanupDraft';
import { waitForFavoriteWrites } from './reportFavorites';

const pendingPrefix = 'litterbugs.deleted-account-cleanup.';
const validId = id => typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id);

export async function clearDeletedAccountData(userId) {
  if (!validId(userId)) throw new Error('Invalid account identifier');
  // This journal is written only after the server confirms deletion. A failed
  // device write can be retried on launch without repeating account deletion.
  const pendingKey = `${pendingPrefix}${userId}`;
  await AsyncStorage.setItem(pendingKey, 'pending');
  await Promise.all([waitForReportDraftWrites(), waitForCleanupDraftWrites(), waitForFavoriteWrites()]);
  const exact = new Set([
    `litterbugs.report-draft.${userId}`,
    `litterbugs.report-submission.${userId}`,
    `litterbugs.report-favorites.v1.${userId}`,
  ]);
  const prefixes = [
    `litterbugs.cleanup-draft.${userId}.`,
    `cleanup-review:${userId}:`,
    `payment-check:v1:${userId}:`,
  ];
  const keys = (await AsyncStorage.getAllKeys()).filter(key =>
    exact.has(key) || prefixes.some(prefix => key.startsWith(prefix)));
  if (keys.length) await AsyncStorage.multiRemove(keys);
  for (const folder of ['report-drafts', 'cleanup-drafts']) {
    await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${folder}/${userId}/`, { idempotent: true });
  }
  await AsyncStorage.removeItem(pendingKey);
}

export async function retryDeletedAccountDataCleanup() {
  const keys = await AsyncStorage.getAllKeys();
  const users = keys.filter(key => key.startsWith(pendingPrefix))
    .map(key => key.slice(pendingPrefix.length)).filter(validId);
  return Promise.allSettled(users.map(clearDeletedAccountData));
}
