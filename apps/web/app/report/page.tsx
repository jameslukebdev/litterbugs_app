import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { realUserIdFromClaims } from '@/lib/report-access';
import HomePage from '../page';
export const metadata = { title: 'Report litter | Litterbugs', robots: { index: false, follow: false } };
export default async function Page() {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  if (!realUserIdFromClaims(data?.claims)) redirect('/sign-in?next=%2Freport');
  return <HomePage />;
}
