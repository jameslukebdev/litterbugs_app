import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { publicFields } from '@/lib/public-profile';
import { PublicSiteHeader } from '@/components/public-site-header';
import { MemberPage } from './member-page';
export const metadata = { title: 'Community member | Litterbugs', robots: { index: false, follow: true } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) notFound();
  const client = await createClient();
  const { data, error } = await client.from('profiles').select(publicFields).eq('id', id).maybeSingle();
  if (error) throw new Error('This member profile could not be loaded. Please try again.');
  if (!data) notFound();
  return <><PublicSiteHeader activePath="/" /><MemberPage profile={data} /></>;
}
