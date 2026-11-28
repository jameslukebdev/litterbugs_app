// Map browsing keeps the reports it has already loaded while the same search is shown
// (same filters, place and blocks), instead of replacing the whole list each time the map
// stops. Pins near each other are grouped, so dropping reports just outside the view and
// loading others reshuffled the groups on screen a moment after the map had stopped.
//
// `previous`: reports from earlier loads of the same search. `loaded`: this load's result for
// `area` (the view it asked about; the load itself reaches a little further). A report inside
// `area` that this load did not return is gone (closed, hidden, expired, filtered out) and is
// removed. Nothing is removed when the load was cut short (`truncated`), because a missing
// report may just be past the limit. The newest copy of each report wins, and the list never
// grows past `limit`: the reports farthest from the view go first.
export const MERGED_REPORT_LIMIT = 1500;

function inArea(area, report) {
  if (!area) return false;
  return Math.abs(report.latitude - area.latitude) <= area.latitudeDelta / 2
    && Math.abs(report.longitude - area.longitude) <= area.longitudeDelta / 2;
}

export function mergeAreaReports(previous, loaded, area, { truncated = false, limit = MERGED_REPORT_LIMIT } = {}) {
  const fresh = new Map(loaded.map(report => [report.id, report]));
  const kept = previous.filter(report => !fresh.has(report.id) && (truncated || !inArea(area, report)));
  // Keep the earlier order for reports already on the map, so nothing is re-sorted.
  const merged = [];
  const seen = new Set();
  for (const report of previous) {
    if (fresh.has(report.id)) { merged.push(fresh.get(report.id)); seen.add(report.id); }
    else if (kept.includes(report)) merged.push(report);
  }
  for (const report of loaded) if (!seen.has(report.id)) merged.push(report);
  if (merged.length <= limit || !area) return merged;
  const distance = report => (report.latitude - area.latitude) ** 2 + (report.longitude - area.longitude) ** 2;
  const keep = new Set([...merged].sort((a, b) => distance(a) - distance(b)).slice(0, limit).map(report => report.id));
  return merged.filter(report => keep.has(report.id));
}
