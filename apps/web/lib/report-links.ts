/**
 * Links into the map and receipts for a report. Replaces the old community "journey" helpers: community
 * pages no longer start reports or funding, so these links carry no community return path.
 */
export function reportMapHref(reportId: string, intent?: 'fund' | 'clean' | 'locate') {
  const query = new URLSearchParams({ report: reportId });
  if (intent) query.set('intent', intent);
  if (intent === 'locate') query.set('view', 'map');
  return `/map?${query}`;
}

export function contributionReturnPath(report: string, contribution: string) {
  return `/payment-return?${new URLSearchParams({ report, contribution })}`;
}

export function receiptReportHref(report: string) {
  return `/account/reports/${encodeURIComponent(report)}?from=payments`;
}
