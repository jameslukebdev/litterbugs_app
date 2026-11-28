/**
 * Readable public addresses for reports: /litter-reports/<title>-<town>-<id>.
 *
 * /reports/<id> stays the stable address the mobile app, share buttons and old
 * links use (the published app only routes that exact shape), and redirects
 * here in a browser. The id at the end is what identifies the report; the words
 * before it are for people and search engines and may change with the title.
 */
export const PUBLIC_REPORT_PATH_PREFIX = '/litter-reports/';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const READABLE_PATH = new RegExp(`^${PUBLIC_REPORT_PATH_PREFIX}(?:[^/]*-)?(${UUID})/?$`, 'i');
const ID_PATH = new RegExp(`^/reports/(${UUID})/?$`, 'i');

function words(value: string | null | undefined) {
  return (value ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Title and verified town as URL words; a title with no usable letters falls back to a plain label. */
export function publicReportSlug(title: string | null | undefined, locality?: string | null) {
  const slug = [words(title).slice(0, 70).replace(/-+$/, '') || 'litter-report', words(locality)].filter(Boolean).join('-');
  return slug;
}

export function publicReportPath(id: string, title: string | null | undefined, locality?: string | null) {
  return `${PUBLIC_REPORT_PATH_PREFIX}${publicReportSlug(title, locality)}-${id.toLowerCase()}`;
}

/** True when a readable address carries this report's current title and id, whatever town words sit between them. */
export function publicReportPathHasTitle(pathname: string, id: string, title: string | null | undefined) {
  const start = `${PUBLIC_REPORT_PATH_PREFIX}${publicReportSlug(title)}-`;
  const path = pathname.toLowerCase().replace(/\/$/, '');
  return path.startsWith(start) && path.endsWith(`-${id.toLowerCase()}`) || path === `${start}${id.toLowerCase()}`;
}

/** Site-relative link to a report's readable address, for cards and lists that already hold its public model. */
export function publicReportHref(report: { id: string; canonicalUrl?: string | null }) {
  try {
    if (report.canonicalUrl) return new URL(report.canonicalUrl).pathname;
  } catch { /* fall through to the id address, which redirects */ }
  return `/reports/${encodeURIComponent(report.id)}`;
}

/** Grouped directory cards open the site, while report/evidence URLs keep their identity. */
export function publicReportCardHref(report: { id: string; canonicalUrl?: string | null; siteLink?: { href: string } }) {
  return report.siteLink?.href ?? publicReportHref(report);
}

/** The report id in a readable address or its route parameter, whatever words precede it. */
export function publicReportIdFromSlug(slug: string) {
  return new RegExp(`(?:^|-)(${UUID})$`, 'i').exec(slug)?.[1].toLowerCase() ?? null;
}

/** The report id when a path is a public report page in either form, else null. */
export function publicReportIdFromPath(pathname: string) {
  return (READABLE_PATH.exec(pathname) ?? ID_PATH.exec(pathname))?.[1].toLowerCase() ?? null;
}

/** True for any path under the two report-page forms, including a malformed readable address. */
export function isPublicReportPagePath(pathname: string) {
  return publicReportIdFromPath(pathname) !== null
    || (pathname.startsWith(PUBLIC_REPORT_PATH_PREFIX) && !pathname.slice(PUBLIC_REPORT_PATH_PREFIX.length).includes('/'));
}
