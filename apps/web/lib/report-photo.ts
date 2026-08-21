const HEIC_PATH_PATTERN = /\.(?:heic|heif)$/i;

export function isHeicReportPhoto(path: string): boolean {
  return HEIC_PATH_PATTERN.test(path.split(/[?#]/, 1)[0]);
}

export function getWebCompatibleReportPhotoUrl(path: string): string | null {
  if (!isHeicReportPhoto(path)) return null;
  return `/api/report-photo?path=${encodeURIComponent(path)}`;
}
