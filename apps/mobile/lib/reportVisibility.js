export function completedImpactReportFilter(nowIso = new Date().toISOString()) {
  return `cleanup_state.in.(completed,claimed,completion_submitted,changes_requested),expires_at.gt.${nowIso}`;
}

export function isVisibleReport(report, now = new Date()) {
  if (!report || report.cancelled_at || report.expired_at) return false;
  if (['completed', 'claimed', 'completion_submitted', 'changes_requested'].includes(report.cleanup_state ?? '')) return true;
  if (!report.expires_at) return true;

  const expiresAt = Date.parse(report.expires_at);
  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}
