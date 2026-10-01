import { notFound, redirect } from 'next/navigation';
import { AccountPage } from '@/components/account-page';
import { createClient } from '@/lib/supabase/server';
import { realUserIdFromClaims } from '@/lib/report-access';

export default async function Page({ params, searchParams }: { params: Promise<{ section?: string[] }>; searchParams: Promise<{ view?: string }> }) {
  const { section = [] } = await params;
  const { view } = await searchParams;
  const activityView = view === 'history' || view === 'reports' ? view : 'current';
  const destination = section[0] ?? '';
  if (section.length > 1 || !['', 'activity', 'reports', 'payments', 'settings', 'connect', 'notifications'].includes(destination)) notFound();
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const userId = realUserIdFromClaims(data?.claims);
  if (!userId) {
    redirect(`/sign-in?next=${encodeURIComponent(`/account${destination ? `/${destination}` : ''}${destination === 'activity' && activityView !== 'current' ? `?view=${activityView}` : ''}`)}`);
  }
  return <AccountPage key={userId} destination={destination} userId={userId} activityView={activityView} />;
}
