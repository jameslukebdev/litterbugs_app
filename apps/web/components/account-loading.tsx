'use client';
import { usePathname } from 'next/navigation';
import { AccountActivityTabs } from './account-activity-tabs';
import { AccountNavigation } from './account-navigation';
import { AccountSectionSkeleton } from './account-section-skeleton';
import { CommunityRank } from './community-rank';

export function AccountLoading({ destination = '' }: { destination?: string }) {
  const section = destination === 'reports' ? 'activity' : destination === 'connect' ? 'payments' : destination;
  const title = section === 'activity' ? 'My activity' : section === 'payments' ? 'Payments' : section === 'settings' ? 'Settings' : section === 'notifications' ? 'Notifications' : 'Profile';
  return <main className="account-page-layout account-v2">
    <AccountNavigation destination={destination} />
    <section className="embedded-panel account-dialog member-dashboard" aria-label="Your Litterbugs account" aria-busy="true">
      <header className="account-screen-title"><h1>{title}</h1></header>
      {section === 'activity' && <AccountActivityTabs activeTab={destination === 'reports' ? 'reports' : 'current'} />}
      {!section || section === 'profile' ? <>
        <header className="member-dashboard-header" aria-hidden="true"><ProfileHeaderSkeleton /></header>
        <CommunityRank userId="" hold />
      </> : <AccountSectionSkeleton section={section} />}
    </section>
  </main>;
}
export function AccountRouteLoading() {
  const pathname = usePathname();
  return <AccountLoading destination={pathname.split('/')[2] ?? ''} />;
}

/**
 * Placeholder for the profile card, built from the same elements as the real one (name, location,
 * joined date, counts, Edit) so the card keeps its exact size when the real details arrive.
 */
export function ProfileHeaderSkeleton() {
  const bar = (width: number) => <span className="account-skeleton" style={{ display: 'inline-block', width, maxWidth: '100%', height: '0.9em', verticalAlign: 'middle', borderRadius: 6 }} />;
  return <>
    <span className="account-avatar account-skeleton" />
    <div className="member-profile-summary" role="status" aria-label="Loading profile">
      {/* The zero-width space gives each line real text height, matching the loaded card exactly. */}
      <h2>{'\u200b'}{bar(170)}</h2>
      <p className="member-profile-location"><span>{'\u200b'}</span>{bar(110)}</p>
      <p className="member-profile-joined">{'\u200b'}{bar(130)}</p>
      <p className="account-v2-counts"><span><strong>{'\u200b'}</strong>{bar(150)}</span></p>
    </div>
    <span className="secondary-button member-edit-profile" aria-hidden="true" style={{ visibility: 'hidden' }}><span>Edit</span></span>
  </>;
}
