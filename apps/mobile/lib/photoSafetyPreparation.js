import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

// The current Cloudmersive free tier accepts files up to 3.5 MB. Keep a
// margin below that boundary so multipart framing and provider rounding never
// turn an otherwise valid photo into a delayed scanner rejection.
export const MEDIA_SCANNER_TARGET_BYTES = 3_250_000;
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
    imageManipulator = ImageManipulator,
  } = {},
) {
  if (!uri) throw new Error('No photo was selected.');
  const originalSize = await fileSize(uri, fileSystem);
  if (originalSize < 1) throw new Error('The selected photo could not be read.');
  if (originalSize > MEDIA_CLIENT_MAX_SOURCE_BYTES) {
    throw new Error('Choose an image smaller than 20 MB.');
  }
  if (originalSize <= MEDIA_SCANNER_TARGET_BYTES) {
    return { uri, byteSize: originalSize, mimeType: null, optimized: false };
  }

  const first = await imageManipulator.manipulateAsync(uri, [], {
    compress: 0.72,
    format: imageManipulator.SaveFormat.JPEG,
  });
  const firstSize = await fileSize(first.uri, fileSystem);
  if (firstSize > 0 && firstSize <= MEDIA_SCANNER_TARGET_BYTES) {
    return { uri: first.uri, byteSize: firstSize, mimeType: 'image/jpeg', optimized: true };
  }

  const attempts = [
    { maxEdge: 2560, compress: 0.7 },
    { maxEdge: 1920, compress: 0.68 },
  ];
  for (const attempt of attempts) {
    const result = await imageManipulator.manipulateAsync(
      uri,
      resizeAction(first.width, first.height, attempt.maxEdge),
      { compress: attempt.compress, format: imageManipulator.SaveFormat.JPEG },
    );
    const size = await fileSize(result.uri, fileSystem);
    if (size > 0 && size <= MEDIA_SCANNER_TARGET_BYTES) {
      return { uri: result.uri, byteSize: size, mimeType: 'image/jpeg', optimized: true };
    }
  }

  throw new Error('This photo is too large to check safely. Choose a smaller image.');
}
