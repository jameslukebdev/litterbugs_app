import { expect, it } from 'vitest';
import { publicPageMetadata } from './public-page-metadata';
it('uses page-specific sharing copy without changing canonical or indexability', () => {
  const result = publicPageMetadata({
    title: 'Fund a cleanup',
    description: 'Help fund real work.',
    alternates: { canonical: '/fund-a-cleanup' },
    robots: { index: false },
  });
  expect(result.openGraph).toMatchObject({
    title: 'Fund a cleanup',
    description: 'Help fund real work.',
    url: '/fund-a-cleanup',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  });
  expect(result.twitter).toMatchObject({
    card: 'summary_large_image',
    title: 'Fund a cleanup',
  });
  expect(result.robots).toEqual({ index: false });
  expect(result.alternates).toEqual({ canonical: '/fund-a-cleanup' });
});
