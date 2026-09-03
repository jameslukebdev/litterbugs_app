export const MAX_REPORT_PHOTOS = 3;

export function reportPhotoPickerOptions(currentPhotoCount = 0) {
  const remainingSlots = Math.max(
    1,
    MAX_REPORT_PHOTOS - Math.max(0, currentPhotoCount)
  );

  return {
    mediaTypes: ['images'],
    allowsEditing: false,
    allowsMultipleSelection: true,
    selectionLimit: remainingSlots,
    orderedSelection: true,
    presentationStyle: 'fullScreen',
    quality: 0.85,
  };
}

export function mergeReportPhotoUris(currentPhotoUris = [], selectedAssets = []) {
  const selectedUris = selectedAssets
    .map((asset) => asset?.uri)
    .filter(Boolean);

  return [...currentPhotoUris, ...selectedUris].slice(0, MAX_REPORT_PHOTOS);
}
