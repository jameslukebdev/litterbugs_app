import { notFound, permanentRedirect } from 'next/navigation';
import { communityHref } from '@/lib/community-directory';
export default async function LegacyCommunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const href = communityHref(slug);
  if (!href) notFound();
  permanentRedirect(href);
}
