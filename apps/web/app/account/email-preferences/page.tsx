import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmailPreferences } from '@/components/email-preferences';
import { createClient } from '@/lib/supabase/server';
import styles from '@/components/email-preferences.module.css';

export const metadata = { title: 'Email preferences | Litterbugs', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Page() {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) redirect('/sign-in?next=%2Faccount%2Femail-preferences');
  return <main className={styles.page}><Link className={styles.back} href="/account/settings">‹ Settings</Link><EmailPreferences key={data.user.id} /></main>;
}
