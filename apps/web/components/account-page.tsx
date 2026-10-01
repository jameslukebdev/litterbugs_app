'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { realUserId } from '@/lib/report-access';
import { useRouter } from 'next/navigation';
import { NotificationInbox } from '@/components/notification-inbox';
import { AccountDialog } from '@/components/account-dialog';

const destinations = [
  ['', 'Profile'], ['activity', 'My activity'], ['reports', 'My reports'],
  ['payments', 'Payments & payouts'], ['notifications', 'Notifications'], ['settings', 'Settings'],
] as const;
export function AccountPage({ destination, userId }: { destination: string; userId: string }) {
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
  return <main className="account-page-layout">
    <nav className="account-page-nav" aria-label="Your account">
      {destinations.map(([path, label]) => <Link key={path} href={`/account${path ? `/${path}` : ''}`} aria-current={destination === path || (path === 'payments' && destination === 'connect') ? 'page' : undefined}>{label}</Link>)}
    </nav>
    {destination === 'notifications' ? <NotificationInbox key={userId} userId={userId} /> : <AccountDialog key={destination} embedded initialSection={section} initialActivityTab={destination === 'reports' ? 'reports' : 'current'}
      onClose={() => router.push('/')} onSignedOut={() => { router.replace('/sign-in'); router.refresh(); }}
      onOpenReport={id => router.push(`/?report=${encodeURIComponent(id)}`)}
      onResumeDraft={() => router.push('/?compose=resume')}
      onNavigateSection={next => router.push(next === 'profile' ? '/account' : `/account/${next}`)} />}
  </main>;
}
