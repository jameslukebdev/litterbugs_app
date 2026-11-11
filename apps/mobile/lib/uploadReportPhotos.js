import * as FileSystem from 'expo-file-system/legacy';

import { mapInConcurrentBatches, REPORT_PHOTO_UPLOAD_CONCURRENCY } from './concurrentBatch';
import { validatePreparedPhotoForSafetyScan } from './photoSafetyPreparation';
import { uploadSecureMedia } from './secureMediaUpload';
import { supabase } from './supabase';

// Report photo upload (moved out of MapScreen unchanged): each photo is checked,
// size-limited and sent through the secure upload; if any fail, the ones already
// stored are removed again.

const base64ToUint8Array = (base64) => {
  const binaryString = globalThis.atob ? globalThis.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

export const uploadReportPhotos = async (photoUris, reportId, userId, onProgress = () => {}) => {
  const uploadedPaths = [];
  let completedPhotos = 0;

  try {
    onProgress(
      photoUris.length === 1
        ? 'Preparing and safety-checking your photo…'
        : `Preparing and safety-checking ${photoUris.length} photos…`,
    );
    return await mapInConcurrentBatches(
      photoUris,
      async (uri) => {
        const preparedPhoto = await validatePreparedPhotoForSafetyScan(uri);
        const base64 = await FileSystem.readAsStringAsync(preparedPhoto.uri, {
          encoding: 'base64',
        });
        const bytes = base64ToUint8Array(base64);
        if (bytes.byteLength > 5 * 1024 * 1024) {
          throw new Error('Each report photo must be 5 MB or smaller.');
        }

        const candidateExt = (preparedPhoto.uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
        const fileExt = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(candidateExt)
          ? candidateExt
          : 'jpg';
        const mimeType = preparedPhoto.mimeType
          ?? `image/${['jpg', 'jpeg'].includes(fileExt) ? 'jpeg' : fileExt}`;
        return uploadSecureMedia({
          userId,
          kind: 'report',
          bytes,
          mimeType,
          subjectId: reportId,
        });
      },
      {
        concurrency: REPORT_PHOTO_UPLOAD_CONCURRENCY,
        onFulfilled: (filePath) => {
          uploadedPaths.push(filePath);
          completedPhotos += 1;
          onProgress(
            `Photo ${completedPhotos} of ${photoUris.length} safety-checked.`,
          );
        },
      },
    );
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const { error: cleanupError } = await supabase.storage
        .from('report_photos')
        .remove(uploadedPaths);
      if (cleanupError) console.log('New report photo cleanup failed:', cleanupError);
    }
    throw error;
  }
};
