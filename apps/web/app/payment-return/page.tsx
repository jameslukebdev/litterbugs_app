import { PaymentReturnContent } from '@/components/payment-return-content';
export default async function PaymentReturnPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  return <PaymentReturnContent contribution={typeof query.contribution === 'string' ? query.contribution : ''} report={typeof query.report === 'string' ? query.report : ''} />;
}
