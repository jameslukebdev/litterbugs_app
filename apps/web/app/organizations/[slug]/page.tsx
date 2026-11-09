import { notFound, permanentRedirect } from 'next/navigation';
import { communityOrganizations } from '@/lib/community-resources';
import { getCommunity } from '@/lib/community-directory';

/*
 * Organization pages were removed in Nov 2026: each group in a community's "Groups & help" list now links
 * straight to its official website. Old addresses go to that community's Groups & help section.
 * The organization records stay in lib/community-resources.ts so these pages can come back later.
 */
type Props = { params: Promise<{ slug: string }> };
export default async function OrganizationPage({ params }: Props) {
  const { slug } = await params;
  const organization = communityOrganizations.find((item) => item.slug === slug);
  if (!organization) notFound();
  const community = getCommunity(organization.communitySlugs[0]);
  permanentRedirect(community ? `${community.href}#groups` : '/communities');
}
