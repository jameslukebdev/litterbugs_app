import { Alert, Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

export const MAX_CLEANUP_PHOTO_BYTES = 5 * 1024 * 1024;

const ALLOWED_CLEANUP_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const MIME_EXTENSIONS = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
});

const base64ToUint8Array = (base64) => {
  const binary = globalThis.atob
    ? globalThis.atob(base64)
    : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

export async function chooseCleanupPhotos(source, selectionLimit) {
  const permission = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (permission.status !== 'granted') {
    Alert.alert(
      'Permission required',
      source === 'camera'
        ? 'Allow camera access to take after-cleanup photos.'
        : 'Allow photo access to choose after-cleanup photos.'
    );
    return [];
  }

  const options = {
    mediaTypes: ['images'],
    quality: 0.85,
    selectionLimit,
    allowsMultipleSelection: source !== 'camera' && selectionLimit > 1,
  };
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);

  return result.canceled ? [] : (result.assets ?? []).slice(0, selectionLimit);
}

export async function loadCleanupSubmissionContext(cleanupId, userId) {
  const { data: attempt, error: attemptError } = await supabase
    .from('cleanup_attempts')
    .select('id, report_id, cleaner_id, status, claimed_at, claim_expires_at, correction_due_at')
    .eq('id', cleanupId)
    .maybeSingle();

  if (attemptError) throw attemptError;
  if (!attempt || attempt.cleaner_id !== userId) {
    throw new Error('cleanup_submission_not_allowed');
  }
  if (!['claimed', 'changes_requested'].includes(attempt.status)) {
    throw new Error('cleanup_submission_invalid_state');
  }
  if (
    attempt.status === 'changes_requested'
    && (!attempt.correction_due_at || Date.parse(attempt.correction_due_at) <= Date.now())
  ) {
    throw new Error('cleanup_correction_expired');
  }

  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('id, title, severity, cleanup_state')
    .eq('id', attempt.report_id)
    .maybeSingle();

  if (reportError) throw reportError;
  return { attempt, report };
}

const cleanupPhotoMetadata = async (asset) => {
  const info = await FileSystem.getInfoAsync(asset.uri, { size: true });
  const size = asset.fileSize ?? info.size ?? 0;
  if (size > MAX_CLEANUP_PHOTO_BYTES) {
    throw new Error('Each cleanup photo must be smaller than 5 MB.');
  }

  const detectedMimeType = asset.mimeType
    || (Platform.OS === 'ios' && /\.hei[cf]$/i.test(asset.uri)
      ? 'image/heic'
      : 'image/jpeg');
  const mimeType = detectedMimeType === 'image/jpg'
    ? 'image/jpeg'
    : detectedMimeType.toLowerCase();
  if (!ALLOWED_CLEANUP_MIME_TYPES.has(mimeType)) {
    throw new Error('Use JPEG, PNG, WebP, HEIC, or HEIF cleanup photos.');
  }

  return { mimeType, extension: MIME_EXTENSIONS[mimeType] };
};

export async function uploadCleanupSubmission({
  cleanupId,
  userId,
  photos,
  description,
  bagsOrItemsRemoved,
  durationMinutes,
}) {
  const submissionId = Crypto.randomUUID();
  const uploadedPaths = [];

  try {
    for (let index = 0; index < photos.length; index += 1) {
      const asset = photos[index];
      const { mimeType, extension } = await cleanupPhotoMetadata(asset);
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'base64',
      });
      const path = `${userId}/${cleanupId}/${submissionId}/after-${index + 1}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('cleanup_photos')
        .upload(path, base64ToUint8Array(base64), {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
    }

    const { data, error: submissionError } = await supabase.rpc(
      'submit_cleanup',
      {
        target_cleanup_id: cleanupId,
        target_submission_id: submissionId,
        cleanup_description: description,
        cleanup_photo_paths: uploadedPaths,
        cleanup_bags_or_items_removed: bagsOrItemsRemoved,
        cleanup_duration_minutes: durationMinutes,
      }
    );

    if (submissionError) throw submissionError;
    return data;
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabase.storage
        .from('cleanup_photos')
        .remove(uploadedPaths)
        .catch((cleanupError) => {
          console.log('Cleanup photo rollback error:', cleanupError);
        });
    }
    throw error;
  }
}
