import { publicPageMetadata } from '@/lib/public-page-metadata';
import Link from 'next/link';
import {
  Guide,
  ReportCards,
  CleanupProof,
  styles,
} from '@/components/public-website';
import { loadPublicReportFeed } from '@/lib/public-report-feed';
export const dynamic = 'force-dynamic';
export const metadata = publicPageMetadata({
  title: 'Fund a Litter Cleanup | Litterbugs',
  description:
    'Help pay for a real litter cleanup. Learn how contributions, service fees, approval, reporter rewards, and refunds work before choosing a report.',
  alternates: { canonical: '/fund-a-cleanup' },
});
export default async function FundingPage() {
  const [available, completed] = await Promise.all([
    loadPublicReportFeed('fundable', 3),
    loadPublicReportFeed('completed', 6),
  ]);
  const proof = completed.reports.find(
    (r) => r.beforePhotoUrl && r.afterPhotoUrl,
  );
  return (
    <Guide
      activePath="/fund-a-cleanup"
      title="Help pay for a cleaner place."
      intro="You don’t have to pick up the litter to help get it cleaned up. Contribute to a report and build a reward for someone who can do the work."
      action="Choose a report"
      href="/map?view=reports&browse=1&status=available"
    >
      <section>
        <h2>Choose a real spot</h2>
        <p>
          Open a report, review its photos and details, and check whether it is
          accepting contributions. Sign in to contribute between $1 and $1,000
          of principal per transaction. The report’s current eligibility
          controls what you can fund.
        </p>
        <p>
          When an eligible cleaner claims the site, contributions stop and the
          cleanup reward is frozen for that attempt. The cleaner submits after
          photos and a description for review. Payment depends on approval and
          all required checks.
        </p>
      </section>
      <section>
        <h2>Where your contribution goes</h2>
        <p>
          The contributed principal builds the cleaner’s reward. A service fee
          of 20% is added at checkout, plus $0.50 for contributions below $5.
          You see the contribution, fee, and total before paying.
        </p>
        <div className={styles.example}>
          <p>
            <strong>$10 contribution + $2 fee = $12 total</strong>
          </p>
          <p className={styles.note}>
            The $10 goes toward the cleaner’s reward. After approval, $0.50 of
            the fee funds the eligible reporter reward. Example under the
            current fee policy.
          </p>
        </div>
        <p>
          The reporter receives 5% of eligible principal from the fee after an
          approved funded cleanup; this does not reduce the cleaner’s reward.
          Litterbugs retains the remaining fee and covers standard processing
          costs.
        </p>
        <p>
          Contributions support a particular cleanup. They are not charitable
          donations or represented as tax deductible. To support the cost of
          running the platform instead, visit{' '}
          <Link href="/support">Support Litterbugs</Link>.
        </p>
      </section>
      <section>
        <h2>If a cleanup doesn’t go ahead</h2>
        <p>
          Reports are active for 30 days and can be renewed. After expiry, the
          reporter has seven days to renew the report or close it for refunds.
          Closing an expired report, taking no action in that seven-day window,
          or leaving a contribution unused for 23 months starts a refund of the
          original charge, including its service fee.
        </p>
        <p>
          Refunds return to the original payment method; processing time varies.
          Contributions cannot be refunded just because someone changes their
          mind while the report is active. Rejected or disputed work follows the
          review process and may be reopened for another cleaner or closed for
          refunds.
        </p>
        <p>
          <Link href="/cleanup-policy">
            Read the contribution, review, and refund rules
          </Link>{' '}
          before paying.
        </p>
      </section>
      <section id="fundable-reports" aria-labelledby="fundable-reports-title">
        <h2 id="fundable-reports-title">Reports accepting support</h2>
        <ReportCards
          feed={available}
          empty="There are no eligible reports to show here right now. Check the map for current availability."
        />
      </section>
      {proof && <CleanupProof report={proof} />}
    </Guide>
  );
}
