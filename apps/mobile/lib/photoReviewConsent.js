import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export const PHOTO_REVIEW_EXPLANATION = 'Photos are stored by Litterbugs and sent to Cloudmersive to check for unsafe files. Report and cleanup photos may also be shared with Google Gemini to assess photo clarity, litter, hazards, and cleanup progress. AI can make mistakes; it does not send rewards. You can withdraw permission for future uploads in Settings.';
const key = userId => `photo-review-consent:2026-09-09:${userId}`;
const pending = new Map();

// Serialize a multi-photo upload behind one explicit answer. Never send bytes
// to storage or providers before consent, including restored drafts.
export function requirePhotoReviewConsent(userId) {
  if (!userId) return Promise.reject(new Error('Sign in again before uploading photos.'));
  if (pending.has(userId)) return pending.get(userId);
  const request = (async () => {
    if (await AsyncStorage.getItem(key(userId)) === 'allowed') return;
    const allowed = await new Promise(resolve => Alert.alert(
      'Allow photo review?', PHOTO_REVIEW_EXPLANATION,
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Allow photo review', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ));
    if (!allowed) {
      const error = new Error('Your photos weren’t uploaded. Allow photo review when you’re ready to continue.');
      error.code = 'PHOTO_REVIEW_CANCELLED';
      throw error;
    }
    await AsyncStorage.setItem(key(userId), 'allowed');
  })().finally(() => pending.delete(userId));
  pending.set(userId, request);
  return request;
}

export function reviewPhotoPermission(userId) {
  Alert.alert('Photo review permissions', PHOTO_REVIEW_EXPLANATION, [
    { text: 'Done', style: 'cancel' },
    { text: 'Withdraw permission', onPress: async () => {
      try {
        await AsyncStorage.removeItem(key(userId));
        Alert.alert('Permission withdrawn', 'We’ll ask again before your next photo upload. Previously submitted photos and reviews are unchanged.');
      } catch {
        Alert.alert('Couldn’t update permission', 'Please try again.');
      }
    } },
  ]);
}
