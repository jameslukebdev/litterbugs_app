import { publicReportPhotoDescription, publicReportSearchTitle, publicReportStoryDescription, reportLocality } from './public-report-content';
import type { PublicReportShareModel, PublicReportShareState } from './public-report-share-model';

/** The public listing tab a report appears under, named as the tabs name it. */
export function publicReportListing(state: PublicReportShareState) {
  return state === 'completed' ? { name: 'Completed cleanups', path: '/cleanups' }
    : state === 'expired' ? { name: 'Expired reports', path: '/reports/history' }
      : { name: 'Open reports', path: '/reports' };
}

const isoDate = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : undefined;

/**
 * schema.org description of a public report: an Article with its photos, people,
 * dates and town, plus the breadcrumb trail. Only recorded, already-public fields
 * are used, including the address and position the page itself shows.
 */
export function publicReportStructuredData(report: PublicReportShareModel, site: string) {
  const url = report.canonicalUrl;
  const absolute = (path: string) => new URL(path, site).toString();
  const organization = { '@type': 'Organization', '@id': `${site}/#organization`, name: 'Litterbugs', url: site,
    logo: `${site}/brand/litterbugs-favicon-transparent.png` };

  const images = (['before', 'after'] as const).flatMap(kind => {
    const photo = kind === 'before' ? report.beforePhotoUrl : report.afterPhotoUrl;
    // Embedded (data:) photos are for share cards; only linked photos have a public address.
    if (!photo || photo.startsWith('data:')) return [];
    return [{ '@type': 'ImageObject', url: absolute(photo), contentUrl: absolute(photo),
      caption: publicReportPhotoDescription(report, kind).alt }];
  });

  const published = isoDate(report.reportDate);
  const modified = isoDate(report.state === 'completed' ? report.completionDate : report.expiredDate) ?? published;
  const reporter = report.reporterName?.trim();
  const cleaner = report.state === 'completed' ? report.cleanerName?.trim() : undefined;
  const keywords = report.litterTypes.map(value => value.trim()).filter(Boolean);
  const place = reportLocality(report);
  const street = report.address ?? null;
  const address = report.place ?? null;

  const article = {
    '@type': 'Article',
    '@id': `${url}#report`,
    url,
    mainEntityOfPage: url,
    name: report.title,
    headline: publicReportSearchTitle(report),
    description: publicReportStoryDescription(report),
    ...(published ? { datePublished: published } : {}),
    ...(modified ? { dateModified: modified } : {}),
    ...(images.length ? { image: images } : {}),
    ...(reporter && reporter !== 'Community member' ? { author: { '@type': 'Person', name: reporter,
      ...(report.reporterId ? { url: `${site}/members/${encodeURIComponent(report.reporterId)}` } : {}) } } : {}),
    ...(cleaner ? { contributor: { '@type': 'Person', name: cleaner,
      ...(report.cleanerId ? { url: `${site}/members/${encodeURIComponent(report.cleanerId)}` } : {}) } } : {}),
    publisher: organization,
    ...(place || street || report.location ? { contentLocation: { '@type': 'Place', name: street ? `Near ${street.line}` : place ?? report.title,
      ...(address || street ? { address: { '@type': 'PostalAddress',
        ...(street ? { streetAddress: street.street } : {}),
        addressLocality: street?.locality ?? address?.locality, addressRegion: street?.region ?? address?.region,
        ...(street?.postalCode ? { postalCode: street.postalCode } : {}),
        addressCountry: street?.countryCode ?? address?.countryCode } } : {}),
      ...(report.location ? { geo: { '@type': 'GeoCoordinates', latitude: report.location.latitude, longitude: report.location.longitude } } : {}) } } : {}),
    ...(keywords.length ? { keywords: keywords.join(', ') } : {}),
  };

  // Site → the listing tab this report sits under → the report: the same path the page's back link shows.
  const listing = publicReportListing(report.state);
  const trail = [
    { name: 'Litterbugs', item: site },
    { name: listing.name, item: absolute(listing.path) },
    { name: report.title, item: url },
  ];

  return { '@context': 'https://schema.org', '@graph': [
    article,
    { '@type': 'BreadcrumbList', itemListElement: trail.map((entry, index) => ({ '@type': 'ListItem', position: index + 1, ...entry })) },
  ] };
}
