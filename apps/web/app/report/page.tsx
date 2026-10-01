import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { realUserIdFromClaims } from '@/lib/report-access';
export const metadata = { robots: { index: false, follow: false } };
export default async function Page() {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  redirect(realUserIdFromClaims(data?.claims) ? '/?compose=new' : '/sign-in?next=%2Freport');
}
