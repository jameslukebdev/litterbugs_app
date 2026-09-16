export const DEFAULT_REPORT_TITLE = 'Litter Report';

export function normalizeReportTitle(title) {
  return typeof title === 'string' && title.trim()
    ? title.trim()
    : DEFAULT_REPORT_TITLE;
}
