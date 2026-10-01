import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    // Utility pages can be crawled so their noindex directive is visible.
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
