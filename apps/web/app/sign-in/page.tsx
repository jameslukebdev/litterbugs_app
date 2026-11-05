import { redirect } from 'next/navigation';
import { PublicSiteHeader } from '@/components/public-site-header';
import { createClient } from '@/lib/supabase/server';
import { realUserIdFromClaims } from '@/lib/report-access';
import { safeNextPath } from '@/lib/safe-next-path';
import { SignInForm } from './sign-in-form';
export const metadata = { title: 'Sign in | Litterbugs', robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; google?: string }> }) {
  const params = await searchParams;
  const path = safeNextPath(params.next ?? '/account');
  const next = path.startsWith('/sign-in') || path.startsWith('/auth/') ? '/account' : path;
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  if (realUserIdFromClaims(data?.claims)) redirect(next);
  return <><PublicSiteHeader activePath="/" /><SignInForm next={next} message={params.google === 'browser'
    ? 'Use the app’s menu to open this page in Safari or Chrome, then continue with Google. You can also use your email here.'
    : params.google === 'retry' ? 'We couldn’t start Google sign in. Please try again or use your email.' : undefined} /></>;
}
