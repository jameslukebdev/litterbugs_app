'use client';
import { receiptReportHref } from '@/lib/report-links';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PaymentDetail } from '@/components/payment-detail';
export function PaymentReturnContent({ contribution, report }: { contribution: string; report: string }) {
  const router = useRouter();
  return <main className="standalone-page"><section className="standalone-card payment-return-card">
    {contribution ? <PaymentDetail celebrate contributionId={contribution} onOpenReport={id => router.push(receiptReportHref(id))} /> : <><h1>Check payment status</h1><p>Your payment may still be processing. Check your payments before paying again.</p><Link className="primary-button button-link" href="/account/payments">View payments</Link></>}
    <Link className="secondary-button button-link" href={report ? receiptReportHref(report) : '/'}>Return to {report ? 'report' : 'map'}</Link>
  </section></main>;
}
