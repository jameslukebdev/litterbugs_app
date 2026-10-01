import { notFound, redirect } from 'next/navigation';
import { AccountPage } from '@/components/account-page';
import { createClient } from '@/lib/supabase/server';
import { realUserIdFromClaims } from '@/lib/report-access';

export default async function Page({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section = [] } = await params;
  const destination = section[0] ?? '';
  if (section.length > 1 || !['', 'activity', 'reports', 'payments', 'settings', 'connect', 'notifications'].includes(destination)) notFound();
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const userId = realUserIdFromClaims(data?.claims);
  if (!userId) {
    redirect(`/sign-in?next=${encodeURIComponent(`/account${destination ? `/${destination}` : ''}`)}`);
  }
  return <AccountPage key={userId} destination={destination} userId={userId} />;
}
