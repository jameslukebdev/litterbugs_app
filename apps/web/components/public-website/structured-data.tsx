import { getSiteUrl } from '@/lib/env';
import { publicReportStructuredData } from '@/lib/public-report-structured-data';
import type { PublicReportShareModel } from '@/lib/public-report-share-model';

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

export function ReportStructuredData({ report }: { report: PublicReportShareModel }) {
  return <JsonLd value={publicReportStructuredData(report, getSiteUrl())} />;
}

/** Questions and answers from a town's cleanup guide, for search and answer engines. */
export function GuideStructuredData({ questions }: { questions: { question: string; paragraphs: string[] }[] }) {
  if (!questions.length) return null;
  return <JsonLd value={{ '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: questions.map(item => ({ '@type': 'Question', name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.paragraphs.join(' ') } })),
  }} />;
}

/** Breadcrumbs for Leaderboards pages: Leaderboards, then each place down to this page (country, state, town). */
export function CommunityBreadcrumbs({ trail }: { trail: { name: string; path: string }[] }) {
  const url = getSiteUrl();
  return <JsonLd value={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Litterbugs', item: url },
      { '@type': 'ListItem', position: 2, name: 'Leaderboards', item: `${url}/communities` },
      ...trail.map((step, index) => ({ '@type': 'ListItem', position: index + 3, name: step.name, item: `${url}${step.path}` })),
    ],
  }} />;
}
