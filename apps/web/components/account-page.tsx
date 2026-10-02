'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { realUserId } from '@/lib/report-access';
import { useRouter } from 'next/navigation';
import type { NotificationView } from '@/lib/notification-view';
import { NotificationInbox } from '@/components/notification-inbox';
import { AccountDialog } from '@/components/account-dialog';

const destinations = [
  ['', 'Profile'], ['activity', 'My activity'],
  ['payments', 'Payments & payouts'], ['notifications', 'Notifications'], ['settings', 'Settings'],
] as const;
export function AccountPage({ destination, userId, activityView = 'current', notificationView }: { destination: string; userId: string; activityView?: 'current' | 'history' | 'reports'; notificationView?: NotificationView }) {
  const router = useRouter();
  const [sessionMatches, setSessionMatches] = useState(true);
  useEffect(() => {
    const { data } = createClient().auth.onAuthStateChange((_event, session) => {
      if (realUserId(session?.user) !== userId) {
        setSessionMatches(false);
        window.setTimeout(() => router.refresh(), 0);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router, userId]);
  if (!sessionMatches) return <main className="info-page"><p role="status">Updating your account…</p></main>;
  const section = destination === 'reports' ? 'activity' : destination === 'connect' ? 'payments' : destination === 'activity' || destination === 'payments' || destination === 'settings' ? destination : 'profile';
  const selectedDestination = destination === 'reports' ? 'activity' : destination === 'connect' ? 'payments' : destination;
  return <main className="account-page-layout">
    <label className="account-page-mobile-nav">Your account
      <select value={selectedDestination} onChange={event => router.push(`/account${event.target.value ? `/${event.target.value}` : ''}`)}>
        {destinations.map(([path, label]) => <option key={path} value={path}>{label}</option>)}
      </select>
    </label>
    <nav className="account-page-nav" aria-label="Your account">
      {destinations.map(([path, label]) => <Link key={path} href={`/account${path ? `/${path}` : ''}`} aria-current={selectedDestination === path ? 'page' : undefined}>{label}</Link>)}
      <Link className="primary-button" href="/report">Report litter</Link>
    </nav>
    {destination === 'notifications' ? <NotificationInbox key={userId} userId={userId} view={notificationView} /> : <AccountDialog key={`${destination}:${activityView}`} embedded initialSection={section} initialActivityTab={destination === 'reports' ? 'reports' : activityView}
      onClose={() => router.push('/')} onSignedOut={() => { router.replace('/sign-in'); router.refresh(); }}
      onOpenReport={id => router.push(`/account/reports/${encodeURIComponent(id)}?from=${destination === 'reports' ? 'reports' : activityView}`)}
      onResumeDraft={() => router.push('/report')}
      onNavigateSection={next => router.push(next === 'profile' ? '/account' : `/account/${next}`)} />}
  </main>;
}
