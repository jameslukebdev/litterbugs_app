import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { realUserIdFromClaims } from '@/lib/report-access';
import { PaymentPage } from './payment-page';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  if (!realUserIdFromClaims(data?.claims)) redirect(`/sign-in?next=${encodeURIComponent(`/account/payments/${id}`)}`);
  return <PaymentPage id={id} />;
}
