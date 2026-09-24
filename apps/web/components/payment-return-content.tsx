'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PaymentDetail } from '@/components/payment-detail';
export function PaymentReturnContent({ contribution, report }: { contribution: string; report: string }) {
  const router = useRouter();
  return <main className="standalone-page"><section className="standalone-card payment-return-card">
    {contribution ? <PaymentDetail contributionId={contribution} onOpenReport={id => router.push(`/?report=${encodeURIComponent(id)}`)} /> : <><h1>Check payment status</h1><p>Your payment may still be processing. Check Payments in your profile before paying again.</p></>}
    <Link className="secondary-button button-link" href={report ? `/?report=${encodeURIComponent(report)}` : '/'}>Return to {report ? 'report' : 'map'}</Link>
  </section></main>;
}
