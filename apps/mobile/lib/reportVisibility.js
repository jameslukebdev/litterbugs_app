export function completedImpactReportFilter(nowIso = new Date().toISOString()) {
  return `cleanup_state.eq.completed,expires_at.gt.${nowIso}`;
}
