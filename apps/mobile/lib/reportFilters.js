const rewardCents = report => report.cleanup_state === 'completed' ? report.completedRewardCents : report.funded_amount_cents;
export const DEFAULT_REPORT_FILTERS = Object.freeze({
  favoritesOnly: false,
  visibility: 'visible',
  status: 'all',
  funding: 'all',
  severity: 'all',
  radius: 0,
  query: '',
});
export function distanceMiles(a, b) {
  if (
    ![a?.latitude, a?.longitude, b?.latitude, b?.longitude].every(
      Number.isFinite,
    )
  )
    return null;
  const rad = (v) => (v * Math.PI) / 180;
  const n =
    Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 7917.6 * Math.asin(Math.sqrt(Math.min(1, n)));
}
export function matchesReportFilters(report, filters, origin, favoriteIds = [], hiddenIds = []) {
  if (filters.favoritesOnly && !favoriteIds.includes(report.id)) return false;
  if (filters.visibility === 'hidden' ? !hiddenIds.includes(report.id) : hiddenIds.includes(report.id)) return false;
  const state = report.cleanup_state;
  if (filters.status === 'available' && state !== 'available') return false;
  if (
    filters.status === 'progress' &&
    !['claimed', 'completion_submitted', 'changes_requested'].includes(state)
  )
    return false;
  if (filters.status === 'completed' && state !== 'completed') return false;
  if (filters.funding === 'funded' && !(rewardCents(report) > 0))
    return false;
  if (filters.funding === 'volunteer' && (rewardCents(report) == null || rewardCents(report) > 0))
    return false;
  if (
    filters.severity !== 'all' &&
    String(report.severity).toLowerCase() !== filters.severity
  )
    return false;
  if (
    filters.query.trim() &&
    !`${report.title || ''} ${report.notes || ''}`
      .toLowerCase()
      .includes(filters.query.trim().toLowerCase())
  )
    return false;
  const distance = distanceMiles(origin, report);
  return !filters.radius || (distance !== null && distance <= filters.radius);
}
