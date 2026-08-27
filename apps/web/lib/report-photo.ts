const HEIC_PATH_PATTERN = /\.(?:heic|heif)$/i;

export function isHeicReportPhoto(path: string): boolean {
  return HEIC_PATH_PATTERN.test(path.split(/[?#]/, 1)[0]);
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
