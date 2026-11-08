'use client';
import { communityReceiptReportHref, communityReturnPath } from '@/lib/community-journey';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PaymentDetail } from '@/components/payment-detail';
export function PaymentReturnContent({ contribution, report, returnTo }: { contribution: string; report: string; returnTo?: string }) {
  const router = useRouter();
  const community = communityReturnPath(returnTo);
  return <main className="standalone-page"><section className="standalone-card payment-return-card">
    {contribution ? <PaymentDetail celebrate contributionId={contribution} onOpenReport={id => router.push(communityReceiptReportHref(id, community))} /> : <><h1>Check payment status</h1><p>Your payment may still be processing. Check your payments before paying again.</p><Link className="primary-button button-link" href="/account/payments">View payments</Link></>}
    <Link className="secondary-button button-link" href={report ? communityReceiptReportHref(report, community) : '/'}>Return to {report ? 'report' : 'map'}</Link>
    {community && <Link className="secondary-button button-link" href={community}>Back to community</Link>}
  </section></main>;
}
