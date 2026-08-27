const HEIC_PATH_PATTERN = /\.(?:heic|heif)$/i;
const CARD_PHOTO_PATH_PATTERN = /\.(?:heic|heif|jpe?g|png|webp)$/i;

export function isHeicReportPhoto(path: string): boolean {
  return HEIC_PATH_PATTERN.test(path.split(/[?#]/, 1)[0]);
}

export function isReportCardPhoto(path: string): boolean {
  return CARD_PHOTO_PATH_PATTERN.test(path.split(/[?#]/, 1)[0]);
}

export function getReportCardPhotoUrl(path: string): string | null {
  if (!isReportCardPhoto(path)) return null;
  return `/api/report-photo?${new URLSearchParams({ path, variant: 'card' }).toString()}`;
}

export function getWebCompatibleReportPhotoUrl(
  path: string,
  options?: { adminCaseId?: string },
): string | null {
  if (!isHeicReportPhoto(path)) return null;
  const params = new URLSearchParams({ path });
  if (options?.adminCaseId) params.set('caseId', options.adminCaseId);
  return `/api/report-photo?${params.toString()}`;
}
