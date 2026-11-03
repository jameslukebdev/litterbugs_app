import { publicPageMetadata } from '@/lib/public-page-metadata';
import Link from 'next/link';
import { Guide, ReportCards } from '@/components/public-website';
import { loadPublicReportFeed } from '@/lib/public-report-feed';
export const dynamic = 'force-dynamic';
export const metadata = publicPageMetadata({
  title: 'Find Volunteer & Funded Litter Cleanups | Litterbugs',
  description:
    'Find litter cleanup opportunities, understand funded and volunteer work, and learn how claiming, evidence, review, and cleanup rewards work.',
  alternates: { canonical: '/cleaner' },
});
export default async function CleanerPage() {
  const available = await loadPublicReportFeed('available', 3);
  return (
    <Guide
      activePath="/cleaner"
      title="Find your next cleanup."
      intro="Find funded and volunteer cleanups near you."
      action="Find a cleanup"
      href="/map?view=reports&browse=1&status=available"
    >
      <section>
        <h2>Find the right fit</h2>
        <p>
          Each report includes photos, litter types, access notes, and any
          available cleanup reward.
        </p>
        <p>
          A displayed reward is the contributed principal available for the
          cleanup. It is not guaranteed earnings. A report with no funded reward
          is a volunteer opportunity. You can also clean a site you reported and
          receive both eligible rewards.
        </p>
      </section>
      <section>
        <h2>Check safety and eligibility first</h2>
        <p>
          You must be 18 or older and accept the cleanup safety acknowledgment.
          Confirm that you can access the site legally, handle the litter
          safely, and arrange proper disposal. Never enter private property
          without permission.
        </p>
        <p>
          Do not handle needles, chemicals, unknown substances, medical waste,
          or other hazards, or work in traffic or unsafe terrain. Decline a site
          that requires specialist training or equipment you don’t have.
        </p>
        <p>
          Funded rewards require eligible US Stripe payout setup.{' '}
          <Link href="/account/connect">Set up your payouts</Link> and read the{' '}
          <Link href="/cleanup-safety">full safety guidelines</Link> before
          claiming work.
        </p>
      </section>
      <section>
        <h2>Claim, clean, and show the result</h2>
        <ol>
          <li>
            <strong>Claim an available report.</strong> The funded reward is
            frozen and new contributions stop for your attempt.
          </li>
          <li>
            <strong>Complete the work and submit evidence within 24 hours.</strong> Follow the
            site’s access conditions and local disposal rules. Stop if
            conditions are unsafe.
          </li>
          <li>
            <strong>Submit clear evidence.</strong> Add one to three original
            after photos and a description. Show the same site and enough detail
            to compare with the original report.
          </li>
        </ol>
        <p>
          Use your account to track the cleanup, submit evidence, or respond to
          a request for better photos. Don’t reuse the before photos or submit
          unrelated or altered evidence.
        </p>
      </section>
      <section>
        <h2>Review comes before payment</h2>
        <p>
          Evidence is checked and may need clarification or administrator
          review. After it passes, the reporter has up to 48 hours to approve or
          dispute the work. Approval can end that window early; an open dispute
          pauses the reward. If the reporter takes no action, the cleanup is
          automatically approved when the 48-hour window expires.
        </p>
        <p>
          After approval and all required checks, the cleaner’s frozen reward is
          processed through Stripe. Identity, payout eligibility, fraud checks,
          and unresolved disputes can affect payment. Stripe transfer and bank
          arrival are separate steps.
        </p>
        <p>
          <Link href="/cleanup-policy">
            Read the full cleanup and reward policy
          </Link>
          . Cleaners participate independently and provide their own
          transportation, tools, protective equipment, and disposal
          arrangements.
        </p>
      </section>
      <section>
        <h2>Available reports</h2>
        <ReportCards
          feed={available}
          empty="No available reports in this area yet."
        />
      </section>
    </Guide>
  );
}
