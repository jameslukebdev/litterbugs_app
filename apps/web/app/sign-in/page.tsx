import { redirect } from 'next/navigation';
import MapPage from '@/components/map-page';
import { createClient } from '@/lib/supabase/server';
import { realUserIdFromClaims } from '@/lib/report-access';
import { safeNextPath } from '@/lib/safe-next-path';
import { SignInForm } from './sign-in-form';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in | Litterbugs', robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; google?: string; view?: string }> }) {
  const params = await searchParams;
  const path = safeNextPath(params.next ?? '/account');
  const next = path.startsWith('/sign-in') || path.startsWith('/auth/') ? '/account' : path;
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  if (realUserIdFromClaims(data?.claims)) redirect(next);
  // Show the map itself (not the report list) behind the form on every screen size.
  if (params.view !== 'map') {
    const query = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
    query.set('view', 'map');
    redirect(`/sign-in?${query}`);
  }
  // The live map sits behind the sign-in form so visitors can see what Litterbugs offers.
  return <><MapPage /><SignInForm next={next} message={params.google === 'browser'
    ? 'Use the app’s menu to open this page in Safari or Chrome, then continue with Google. You can also use your email here.'
    : params.google === 'retry' ? 'We couldn’t start Google sign in. Please try again or use your email.' : undefined} /></>;
}
