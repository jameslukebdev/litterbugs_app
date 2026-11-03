import communityTheme from '@/components/communities/community-theme.module.css';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Website, styles as websiteStyles } from '@/components/public-website';
import { ResourceDirectory } from '@/components/communities/community-controls';
import { communityOrganizations } from '@/lib/community-resources';
import { getCommunity, isPublishedCommunity } from '@/lib/community-directory';
import { publicPageMetadata } from '@/lib/public-page-metadata';
import styles from '@/components/communities/communities.module.css';
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const organization = communityOrganizations.find((item) => item.slug === slug);
  return organization ? publicPageMetadata({ title: `${organization.name} Cleanup Resources | Litterbugs`, description: organization.description, alternates: { canonical: `/organizations/${slug}` }, robots: { index: false, follow: true } }) : { title: 'Organization not found | Litterbugs', robots: { index: false } };
}
export default async function OrganizationPage({ params }: Props) {
  const { slug } = await params;
  const organization = communityOrganizations.find((item) => item.slug === slug);
  if (!organization) notFound();
  const served = organization.communitySlugs.map(getCommunity).filter(item => item && isPublishedCommunity(item));
  const primary = served[0];
  return <Website activePath="/communities"><main id="main-content" tabIndex={-1} className={`${websiteStyles.wide} ${communityTheme.theme} ${styles.hub}`}><header><Link className={styles.breadcrumb} href={primary?.href ?? "/communities"}>{primary?.name ?? "Communities"}</Link><h1>{organization.name}</h1><p>{organization.description}</p><a className="primary-button button-link" href={organization.href} target="_blank" rel="noopener noreferrer">Visit official website</a></header><section><h2>Cleanup programs &amp; resources</h2><ResourceDirectory organizationSlug={slug} /></section><section><h2>Communities served</h2>{served.map(community => community && <Link key={community.slug} className={styles.textLink} href={community.href}>{community.name}, {community.administrativeArea}</Link>)}<p className={styles.directoryNote}>Contact the organization directly about participation and availability.</p></section></main></Website>;
}
