import * as FileSystem from 'expo-file-system/legacy';
import { requireOptionalNativeModule } from 'expo-modules-core';

function loadInstalledImageManipulator() {
  if (!requireOptionalNativeModule('ExpoImageManipulator')) return null;

  try {
    return require('expo-image-manipulator');
  } catch (error) {
    console.log('Photo optimization unavailable:', error);
    return null;
  }
}

const installedImageManipulator = loadInstalledImageManipulator();

export function isPhotoOptimizationAvailable() {
  return Boolean(installedImageManipulator);
}

// The current Cloudmersive free tier accepts files up to 3.5 MB. Keep a
// margin below that boundary so multipart framing and provider rounding never
// turn an otherwise valid photo into a delayed scanner rejection.
export const MEDIA_SCANNER_TARGET_BYTES = 3_250_000;
export const MEDIA_UPLOAD_TARGET_BYTES = 1_750_000;
export const MEDIA_UPLOAD_MAX_EDGE = 2048;
// Modern phone photos can be larger than the upload limit before compression.
// Permit a normal camera original here; only the prepared result is uploaded.
export const MEDIA_CLIENT_MAX_SOURCE_BYTES = 20 * 1024 * 1024;

async function fileSize(uri, fileSystem) {
  const info = await fileSystem.getInfoAsync(uri, { size: true });
  return info.exists === false ? 0 : (info.size ?? 0);
}

function resizeAction(width, height, maxEdge) {
  if (!width || !height || Math.max(width, height) <= maxEdge) return [];
  return width >= height
    ? [{ resize: { width: maxEdge } }]
    : [{ resize: { height: maxEdge } }];
}

export async function preparePhotoForSafetyScan(
  uri,
  {
    fileSystem = FileSystem,
    imageManipulator = installedImageManipulator,
  } = {},
) {
  if (!uri) throw new Error('No photo was selected.');
  const originalSize = await fileSize(uri, fileSystem);
  if (originalSize < 1) throw new Error('The selected photo could not be read.');
  if (originalSize > MEDIA_CLIENT_MAX_SOURCE_BYTES) {
    throw new Error('Choose an image smaller than 20 MB.');
  }
  if (!imageManipulator) {
    if (originalSize <= MEDIA_SCANNER_TARGET_BYTES) {
      return { uri, byteSize: originalSize, mimeType: null, optimized: false };
    }
    throw new Error('Update the Litterbugs development app to upload photos larger than 3 MB.');
  }

  const first = await imageManipulator.manipulateAsync(uri, [], {
    compress: 0.75,
    format: imageManipulator.SaveFormat.JPEG,
  });
  const needsResize = Math.max(first.width ?? 0, first.height ?? 0) > MEDIA_UPLOAD_MAX_EDGE;
  const normalized = needsResize
    ? await imageManipulator.manipulateAsync(
      uri,
      resizeAction(first.width, first.height, MEDIA_UPLOAD_MAX_EDGE),
      { compress: 0.75, format: imageManipulator.SaveFormat.JPEG },
    )
    : first;
  const normalizedSize = await fileSize(normalized.uri, fileSystem);
  if (normalizedSize > 0 && normalizedSize <= MEDIA_UPLOAD_TARGET_BYTES) {
    return {
      uri: normalized.uri,
      byteSize: normalizedSize,
      mimeType: 'image/jpeg',
      optimized: true,
    };
  }
  let scannerSafeResult = normalizedSize > 0 && normalizedSize <= MEDIA_SCANNER_TARGET_BYTES
    ? { uri: normalized.uri, byteSize: normalizedSize, mimeType: 'image/jpeg', optimized: true }
    : null;

  const attempts = [
    { maxEdge: 1600, compress: 0.68 },
    { maxEdge: 1280, compress: 0.62 },
  ];
  for (const attempt of attempts) {
    const result = await imageManipulator.manipulateAsync(
      uri,
      resizeAction(first.width, first.height, attempt.maxEdge),
      { compress: attempt.compress, format: imageManipulator.SaveFormat.JPEG },
    );
    const size = await fileSize(result.uri, fileSystem);
    if (size > 0 && size <= MEDIA_UPLOAD_TARGET_BYTES) {
      return { uri: result.uri, byteSize: size, mimeType: 'image/jpeg', optimized: true };
    }
    if (size > 0 && size <= MEDIA_SCANNER_TARGET_BYTES) {
      scannerSafeResult = {
        uri: result.uri,
        byteSize: size,
        mimeType: 'image/jpeg',
        optimized: true,
      };
    }
  }

  if (scannerSafeResult) return scannerSafeResult;
  throw new Error('This photo is too large to check safely. Choose a smaller image.');
}

export async function validatePreparedPhotoForSafetyScan(
  uri,
  { fileSystem = FileSystem } = {},
) {
  if (!uri) throw new Error('No photo was selected.');
  const byteSize = await fileSize(uri, fileSystem);
  if (byteSize < 1) throw new Error('The selected photo could not be read.');
  if (byteSize > MEDIA_SCANNER_TARGET_BYTES) {
    throw new Error('This photo is too large to check safely. Choose a smaller image.');
  }
  return { uri, byteSize };
}
