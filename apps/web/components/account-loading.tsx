'use client';
import { usePathname } from 'next/navigation';
import { AccountActivityTabs } from './account-activity-tabs';
import { AccountNavigation } from './account-navigation';
import { AccountSectionSkeleton } from './account-section-skeleton';

export function AccountLoading({ destination = '' }: { destination?: string }) {
  const section = destination === 'reports' ? 'activity' : destination === 'connect' ? 'payments' : destination;
  const title = section === 'activity' ? 'My activity' : section === 'payments' ? 'Payments' : section === 'settings' ? 'Settings' : section === 'notifications' ? 'Notifications' : 'Profile';
  return <main className="account-page-layout">
    <AccountNavigation destination={destination} />
    <section className="embedded-panel account-dialog member-dashboard" aria-label="Your Litterbugs account" aria-busy="true">
      <header className="account-screen-title"><h1>{title}</h1></header>
      {section === 'activity' && <AccountActivityTabs activeTab={destination === 'reports' ? 'reports' : 'current'} />}
      {!section || section === 'profile' ? <>
        <header className="member-dashboard-header" aria-hidden="true"><span className="account-avatar account-skeleton" /><div className="member-profile-summary"><span className="account-skeleton account-skeleton-name" /><span className="account-skeleton account-skeleton-line" /></div></header>
        <section className="community-rank" aria-hidden="true"><div className="community-rank-summary"><span className="account-skeleton community-rank-artwork" /><span className="account-skeleton account-skeleton-name" /></div><div className="community-rank-progress"><p><span className="account-skeleton account-skeleton-line" /></p><progress max={100} value={0} /><small>&nbsp;</small></div><details><summary>How points work</summary></details></section>
      </> : <AccountSectionSkeleton section={section} />}
    </section>
  </main>;
}
export function AccountRouteLoading() {
  const pathname = usePathname();
  return <AccountLoading destination={pathname.split('/')[2] ?? ''} />;
}
