import {
  MEDIA_PICKER_COMPRESSION_QUALITY,
  MEDIA_PICKER_FALLBACK_COMPRESSION_QUALITY,
} from './mediaCompression';

export const MAX_REPORT_PHOTOS = 3;

function pickerCompressionQuality(nativePhotoOptimizationAvailable) {
  return nativePhotoOptimizationAvailable
    ? MEDIA_PICKER_COMPRESSION_QUALITY
    : MEDIA_PICKER_FALLBACK_COMPRESSION_QUALITY;
}

export function reportCameraPickerOptions({ nativePhotoOptimizationAvailable = true } = {}) {
  return {
    mediaTypes: ['images'],
    allowsEditing: false,
    allowsMultipleSelection: false,
    selectionLimit: 1,
    quality: pickerCompressionQuality(nativePhotoOptimizationAvailable),
  };
}

export function reportPhotoPickerOptions(
  currentPhotoCount = 0,
  { nativePhotoOptimizationAvailable = true } = {},
) {
  const remainingSlots = Math.max(
    1,
    MAX_REPORT_PHOTOS - Math.max(0, currentPhotoCount)
  );
  const allowsMultipleSelection = nativePhotoOptimizationAvailable && remainingSlots > 1;

  return {
    mediaTypes: ['images'],
    allowsEditing: false,
    allowsMultipleSelection,
    selectionLimit: allowsMultipleSelection ? remainingSlots : 1,
    orderedSelection: allowsMultipleSelection,
    preferredAssetRepresentationMode: 'compatible',
    presentationStyle: 'fullScreen',
    quality: pickerCompressionQuality(nativePhotoOptimizationAvailable),
  };
}

export function mergeReportPhotoUris(currentPhotoUris = [], selectedAssets = []) {
  const selectedUris = selectedAssets
    .map((asset) => asset?.uri)
    .filter(Boolean);

  return [...currentPhotoUris, ...selectedUris].slice(0, MAX_REPORT_PHOTOS);
}
