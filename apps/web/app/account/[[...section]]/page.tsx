import { notificationView, notificationInboxHref } from '@/lib/notification-view';
import { notFound, redirect } from 'next/navigation';
import { AccountPage } from '@/components/account-page';
import { createClient } from '@/lib/supabase/server';
import { realUserIdFromClaims } from '@/lib/report-access';

export default async function Page({ params, searchParams }: { params: Promise<{ section?: string[] }>; searchParams: Promise<{ view?: string; filter?: string; page?: string; renewal?: string }> }) {
  const { section = [] } = await params;
  const query = await searchParams;
  const { view } = query;
  const inbox = notificationView(query);
  const activityView = view === 'history' || view === 'reports' ? view : 'current';
  const destination = section[0] ?? '';
  if (section.length > 1 || !['', 'activity', 'reports', 'payments', 'settings', 'connect', 'notifications'].includes(destination)) notFound();
  const renewalId = destination === 'reports' && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(query.renewal ?? '') ? query.renewal : undefined;
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const userId = realUserIdFromClaims(data?.claims);
  if (!userId) {
    redirect(`/sign-in?next=${encodeURIComponent(destination === 'notifications' ? notificationInboxHref(inbox) : `/account${destination ? `/${destination}` : ''}${renewalId ? `?renewal=${renewalId}` : destination === 'activity' && activityView !== 'current' ? `?view=${activityView}` : ''}`)}`);
  }
  return <AccountPage key={userId} destination={destination} userId={userId} activityView={activityView} notificationView={inbox} renewalId={renewalId} />;
}
