import { PaymentReturnContent } from '@/components/payment-return-content';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { realUserIdFromClaims } from '@/lib/report-access';
export default async function PaymentReturnPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const contribution = typeof query.contribution === 'string' ? query.contribution : '';
  const report = typeof query.report === 'string' ? query.report : '';
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  if (!realUserIdFromClaims(data?.claims)) {
    // Receipt lookup uses the signed-in account. Preserve identifiers, not provider secrets.
    const nextQuery = new URLSearchParams();
    if (contribution) nextQuery.set('contribution', contribution);
    if (report) nextQuery.set('report', report);
    const next = `/payment-return${nextQuery.size ? `?${nextQuery}` : ''}`;
    redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  }
  return <PaymentReturnContent contribution={contribution} report={report} />;
}
