import type { Metadata } from 'next';

/** Keep sharing text aligned with each page's own title and description. */
export function publicPageMetadata(metadata: Metadata): Metadata {
  const title =
    typeof metadata.title === 'string' ? metadata.title : 'Litterbugs';
  const description = metadata.description ?? 'See litter? Start something.';
  return {
    ...metadata,
    openGraph: {
      type: 'website',
      siteName: 'Litterbugs',
      title,
      description,
      url:
        typeof metadata.alternates?.canonical === 'string' ||
        metadata.alternates?.canonical instanceof URL
          ? metadata.alternates.canonical
          : undefined,
      images: [
        {
          url: '/opengraph-image',
          width: 1200,
          height: 630,
          alt: 'Litterbugs — report litter, help fund a cleanup, or do the work.',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/opengraph-image'],
    },
  };
}
