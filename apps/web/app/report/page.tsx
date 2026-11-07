import { reportEntryContext } from '@/lib/community-journey';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { realUserIdFromClaims } from '@/lib/report-access';
import MapPage from '@/components/map-page';
export const metadata = { title: 'Report litter | Litterbugs', robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams?: Promise<{ community?: string | string[] }> }) {
  const context = reportEntryContext((await searchParams)?.community);
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  if (!realUserIdFromClaims(data?.claims)) redirect(`/sign-in?next=${encodeURIComponent(context?.next ?? '/report')}&view=map`);
  return <MapPage searchParams={context ? Promise.resolve({ area: context.area, returnTo: context.returnTo }) : undefined} />;
}
