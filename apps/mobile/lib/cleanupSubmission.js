import { Alert, Linking, Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';
import { requestGeminiReview } from './funding';
import { withTimeout } from './asyncTimeout';
import { MEDIA_PICKER_COMPRESSION_QUALITY } from './mediaCompression';
import {
  CLEANUP_PHOTO_UPLOAD_CONCURRENCY,
  mapInConcurrentBatches,
} from './concurrentBatch';
import { photoUploadTimer } from './analytics';
import { uploadSecureMedia } from './secureMediaUpload';
import { preparePhotoForSafetyScan } from './photoSafetyPreparation';

export const MAX_CLEANUP_PHOTO_BYTES = 5 * 1024 * 1024;

const ALLOWED_CLEANUP_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

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
        : 'Allow photo access to choose after-cleanup photos.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {
          Alert.alert('App permissions', 'You can allow access in your device’s Settings.');
        }) },
      ]
    );
    return [];
  }

  const options = {
    mediaTypes: ['images'],
    quality: MEDIA_PICKER_COMPRESSION_QUALITY,
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
    .select('id, report_id, cleaner_id, status, claimed_at, claim_expires_at, correction_due_at, issue_paused_at, is_paid, reward_amount_cents')
    .eq('id', cleanupId)
    .maybeSingle();

  if (attemptError) throw attemptError;
  if (!attempt || attempt.cleaner_id !== userId) {
    throw new Error('cleanup_submission_not_allowed');
  }
  if (!['claimed', 'changes_requested'].includes(attempt.status)) {
    throw new Error('cleanup_submission_invalid_state');
  }
  if (attempt.status === 'claimed' && !attempt.issue_paused_at && (!attempt.claim_expires_at || Date.parse(attempt.claim_expires_at) <= Date.now())) {
    throw new Error('cleanup_claim_expired');
  }
  if (
    attempt.status === 'changes_requested'
    && (!attempt.correction_due_at || Date.parse(attempt.correction_due_at) <= Date.now())
  ) {
    throw new Error('cleanup_correction_expired');
  }

  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('id, user_id, title, severity, cleanup_state, cleanup_issue_hold')
    .eq('id', attempt.report_id)
    .maybeSingle();

  if (reportError) throw reportError;
  if (!report) throw new Error('cleanup_submission_not_allowed');
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

  return { mimeType };
};

export async function uploadCleanupSubmission({
  cleanupId,
  userId,
  submissionId = Crypto.randomUUID(),
  photos,
  description,
  bagsOrItemsRemoved,
  weightPounds,
  durationMinutes = null,
  isPaid = false,
  onProgress = () => {},
}) {
  // Reconcile a previous response loss before uploading another set of photos.
  const findSavedSubmission = async () => {
    const { data, error } = await supabase.from('cleanup_submissions').select('*').eq('id', submissionId).eq('cleanup_attempt_id', cleanupId).maybeSingle();
    if (error) throw error;
    return data;
  };
  // Submission already queues a durable server review. Start it immediately,
  // but don't hold the success screen open for the full review round trip.
  const startReview = () => withTimeout(
    requestGeminiReview({ cleanupId }), 3000, 'Review continues in the background.',
  ).catch(() => null);
  const recoveredResult = async (submission) => {
    // A response loss may also have skipped starting the funded review.
    const aiReview = isPaid ? await startReview() : null;
    return { submission, aiReview };
  };
  const existing = await findSavedSubmission();
  if (existing) return recoveredResult(existing);
  let saveDispatched = false;
  const uploadedPaths = [];
  let completedPhotos = 0;

  const timing = photoUploadTimer('clean', photos.length);
  let photosDone = false;

  try {
    onProgress({ stage: 'preparing', current: 1, total: photos.length });
    await mapInConcurrentBatches(
      photos,
      async (asset, index) => {
        const { mimeType, base64 } = await timing.prepare(async () => {
          const preparedPhoto = await preparePhotoForSafetyScan(asset.uri, { width: asset.width, height: asset.height });
          const { mimeType: originalMimeType } = await cleanupPhotoMetadata({
            ...asset,
            uri: preparedPhoto.uri,
            fileSize: preparedPhoto.byteSize,
          });
          return {
            mimeType: preparedPhoto.mimeType ?? originalMimeType,
            base64: await FileSystem.readAsStringAsync(preparedPhoto.uri, { encoding: 'base64' }),
          };
        });
        return timing.upload(() => uploadSecureMedia({
          userId,
          kind: 'cleanup',
          bytes: base64ToUint8Array(base64),
          mimeType,
          subjectId: cleanupId,
          submissionId,
          position: index + 1,
        }));
      },
      {
        concurrency: CLEANUP_PHOTO_UPLOAD_CONCURRENCY,
        onFulfilled: (path, index) => {
          uploadedPaths[index] = path;
          completedPhotos += 1;
          onProgress({
            stage: 'uploading',
            current: completedPhotos,
            total: photos.length,
          });
        },
      },
    );

    timing.finish('ready');
    photosDone = true;
    onProgress({ stage: 'saving', current: photos.length, total: photos.length });
    saveDispatched = true;
    const saveArguments = {
      target_cleanup_id: cleanupId,
      target_submission_id: submissionId,
      cleanup_description: description,
      cleanup_photo_paths: uploadedPaths,
      cleanup_bags_or_items_removed: bagsOrItemsRemoved,
      cleanup_weight_pounds: weightPounds,
    };
    let { data, error: submissionError } = await supabase.rpc(
      'submit_cleanup_with_details',
      { ...saveArguments, cleanup_duration_minutes: durationMinutes }
    );
    // Until the database has submit_cleanup_with_details (PGRST202 = function not
    // found), save without the time spent rather than fail the cleanup.
    if (submissionError?.code === 'PGRST202') {
      ({ data, error: submissionError } = await supabase.rpc('submit_cleanup_with_weight', saveArguments));
    }

    if (submissionError) throw submissionError;
    let aiReview = null;
    if (isPaid) {
      try {
        onProgress({ stage: 'reviewing', current: photos.length, total: photos.length });
        aiReview = await startReview();
      } catch (reviewError) {
        console.log('Funded cleanup review deferred:', reviewError);
      }
    }
    return { submission: data, aiReview };
  } catch (error) {
    if (!photosDone) {
      timing.finish('failed');
      try { Object.defineProperty(error, 'photoStep', { value: timing.failedStep, configurable: true }); } catch { /* frozen error */ }
    }
    if (saveDispatched) {
      const saved = await findSavedSubmission().catch(() => null);
      if (saved) return recoveredResult(saved);
      // A lost response is not proof of rollback. Preserve evidence for reconciliation.
      throw error;
    }
    if (uploadedPaths.length > 0) {
      await supabase.storage
        .from('cleanup_photos')
        .remove(uploadedPaths.filter(Boolean))
        .catch((cleanupError) => {
          console.log('Cleanup photo rollback error:', cleanupError);
        });
    }
    throw error;
  }
}
