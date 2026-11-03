import { getSiteUrl } from '@/lib/env';

function JsonLd({ value }: { value: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{
    __html: JSON.stringify(value).replace(/</g, '\\u003c'),
  }} />;
}

export function WebsiteStructuredData() {
  const url = getSiteUrl();
  return <JsonLd value={{ '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': `${url}/#organization`, name: 'Litterbugs', url,
      logo: `${url}/brand/litterbugs-favicon-transparent.png` },
    { '@type': 'WebSite', '@id': `${url}/#website`, name: 'Litterbugs', url,
      publisher: { '@id': `${url}/#organization` } },
  ] }} />;
}

export function CommunityBreadcrumbs({ name, path }: { name: string; path: string }) {
  const url = getSiteUrl();
  return <JsonLd value={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Litterbugs', item: url },
      { '@type': 'ListItem', position: 2, name: 'Communities', item: `${url}/communities` },
      { '@type': 'ListItem', position: 3, name, item: `${url}${path}` },
    ],
  }} />;
}
