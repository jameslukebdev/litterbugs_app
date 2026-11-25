// Public site history is projected by the website through anonymous RLS.
const ORIGIN = process.env.EXPO_PUBLIC_WEBSITE_URL || 'https://litterbugs.app';
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export async function loadReportSite(reportId, signal) {
  if (!uuid.test(reportId || '')) return null;
  const response = await fetch(`${ORIGIN}/api/report-sites/${reportId}`, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Timeline could not be loaded.');
  const site = await response.json();
  if (!site) return null;
  if (site.local || !uuid.test(site.id) || !Array.isArray(site.reports) || site.reports.some(report => !uuid.test(report.id))) throw new Error('Timeline could not be loaded.');
  return site;
}
export function sitePhotoUrl(path) {
  if (!path) return null;
  const url = new URL(path, ORIGIN);
  return url.origin === ORIGIN && /^\/reports\/[0-9a-f-]{36}\/photo\/(before|after)$/.test(url.pathname) ? url.toString() : null;
}
export function siteTimeline(report) {
  const donations = report.contributorCredit?.donations ?? [];
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100);
  return [
    { at: report.reportDate, label: `Reported${report.reporterName ? ` by ${report.reporterName}` : ''}` },
    ...donations.map(d => ({ at: d.donatedAt, label: `${money(d.amountCents)} donated${d.name ? ` by ${d.name}` : ' anonymously'}` })),
    { at: donations.length ? null : report.fundedDate, label: 'First donation received' },
    { at: report.state === 'completed' ? report.claimedDate : null, label: 'Cleanup claimed' },
    { at: report.state === 'completed' ? report.completionDate : null, cleanup: true, label: `Cleaned up${report.cleanerName ? ` by ${report.cleanerName}` : ''}` },
    { at: report.state === 'expired' ? report.expiredDate : null, label: 'Report expired without a confirmed cleanup' },
  ].filter(event => event.at && Number.isFinite(Date.parse(event.at))).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
export function siteRepresentatives(reports) {
  const latest = new Map();
  for (const report of reports) {
    const key = report.cleanup_site_id || report.id;
    const prior = latest.get(key);
    if (!prior || (Date.parse(report.created_at || '') || 0) > (Date.parse(prior.created_at || '') || 0) || (report.created_at === prior.created_at && report.id > prior.id)) latest.set(key, report);
  }
  return reports.filter(report => latest.get(report.cleanup_site_id || report.id) === report);
}
export function alreadyReportedId(error) {
  return error?.message?.includes('site_already_reported') && uuid.test(error.details || '') ? error.details : null;
}
