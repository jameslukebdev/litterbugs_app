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
      <AccountSectionSkeleton section={section} />
    </section>
  </main>;
}
export function AccountRouteLoading() {
  const pathname = usePathname();
  return <AccountLoading destination={pathname.split('/')[2] ?? ''} />;
}
