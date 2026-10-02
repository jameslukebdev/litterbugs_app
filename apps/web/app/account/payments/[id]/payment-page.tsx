'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PaymentDetail } from '@/components/payment-detail';
export function PaymentPage({ id }: { id: string }) {
  const router = useRouter();
  return <main className="info-page"><Link href="/account/payments">Back to payments</Link><PaymentDetail standalone contributionId={id} onOpenReport={report => router.push(`/account/reports/${encodeURIComponent(report)}?from=payments`)} /></main>;
}
