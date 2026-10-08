'use client';
import { AccountNavigation } from './account-navigation';
import { AccountLoading } from './account-loading';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { realUserId } from '@/lib/report-access';
import { useRouter } from 'next/navigation';
import type { NotificationView } from '@/lib/notification-view';
import { NotificationInbox } from '@/components/notification-inbox';
import { AccountDialog } from '@/components/account-dialog';

export function AccountPage({ destination, userId, activityView = 'current', notificationView, renewalId }: { destination: string; userId: string; activityView?: 'current' | 'history' | 'reports'; notificationView?: NotificationView; renewalId?: string }) {
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
  if (!sessionMatches) return <AccountLoading destination={destination} />;
  const section = destination === 'reports' ? 'activity' : destination === 'connect' ? 'payments' : destination === 'activity' || destination === 'payments' || destination === 'settings' ? destination : 'profile';
  return <main className="account-page-layout">
    <AccountNavigation destination={destination} />
    {destination === 'notifications' ? <NotificationInbox key={userId} userId={userId} view={notificationView} /> : <AccountDialog key={`${destination}:${activityView}`} embedded initialRenewalId={renewalId} initialSection={section} initialActivityTab={destination === 'reports' ? 'reports' : activityView}
      onClose={() => router.push('/')} onSignedOut={() => { router.replace('/sign-in'); router.refresh(); }}
      onOpenReport={id => router.push(`/account/reports/${encodeURIComponent(id)}?from=${destination === 'reports' ? 'reports' : activityView}`)}
      onResumeDraft={() => router.push('/report')}
      onNavigateSection={next => router.push(next === 'profile' ? '/account' : `/account/${next}`)} />}
  </main>;
}
