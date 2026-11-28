import { publicPageMetadata } from '@/lib/public-page-metadata';
import Link from 'next/link';
import { Guide, CleanupProof, styles } from '@/components/public-website';
import { loadPublicReportFeed } from '@/lib/public-report-feed';
export const dynamic = 'force-dynamic';
export const metadata = publicPageMetadata({
  title: 'Report Litter & Earn Reporter Rewards | How It Works',
  description:
    'Learn how to report litter for free, add useful photos and a location, and earn 5% of eligible contributions after an approved funded cleanup.',
  alternates: { canonical: '/report-litter' },
});
export default async function ReportLitterPage() {
  const completed = await loadPublicReportFeed('completed', 6);
  const proof = completed.reports.find(
    (report) => report.beforePhotoUrl && report.afterPhotoUrl,
  );
  return (
    <Guide
      activePath="/report-litter"
      title="Report litter. Start something."
      intro="You already notice the trash on your walk, beside the road, or around your neighborhood. A few photos and a location can help turn that spot into a cleanup—and a chance to earn."
      action="Report litter"
      href="/report"
    >
      <section>
        <h2>Make a useful report</h2>
        <ol>
          <li>
            <strong>Photograph the spot.</strong> Show the litter and enough of
            its surroundings for someone to understand the work. Use your own
            clear photos; keep unnecessary faces, license plates, and private
            information out of the frame.
          </li>
          <li>
            <strong>Confirm the location.</strong> Mark the actual littered spot
            and check the map before submitting. Stay somewhere you can access
            safely and legally.
          </li>
          <li>
            <strong>Describe what’s there.</strong> Add a short title, the kinds
            of litter you can see, and useful access or safety notes. Check the
            map for an existing report first.
          </li>
        </ol>
        <p>
          Everyday litter includes bottles, cans, food packaging, and discarded
          bags. Don’t approach or handle hazardous waste to get a photo. For
          urgent hazards, suspected illegal dumping, or situations requiring an
          official response, contact the appropriate local authority.
        </p>
        <p>
          <Link href="/cleanup-safety">Read the safety guidelines</Link> before
          visiting a site.
        </p>
      </section>
      <section>
        <h2>You report it. Others can help.</h2>
        <p>
          Reporting is free. A permanent account is required to publish a
          report and track it in your account. You must be at least 13 to create
          an account, with parent or guardian permission if you are under the
          age of legal majority where you live. Earning a reward requires age 18+. Published reports can be discovered by other members, who may
          contribute to an eligible cleanup or claim the work.
        </p>
        <p>
          You don’t have to do the cleanup yourself. If you want to, you can
          also clean a report you created, subject to the same safety, review,
          and payout rules as anyone else.
        </p>
        <p>
          Litterbugs is a community cleanup platform. A report does not
          automatically contact a council, sanitation department, police agency,
          or property owner. It is not a way to report a driver who threw litter
          from a vehicle.
        </p>
      </section>
      <section id="rewards">
        <h2>How reporter rewards work</h2>
        <p>
          After an eligible funded cleanup is approved, the person who created
          the report earns <strong>5% of eligible contributed principal</strong>
          . This comes from the service fee and does not reduce the cleaner’s
          reward.
        </p>
        <div className={styles.example}>
          <p>
            <strong>$100 funded → $5 reporter reward</strong>
          </p>
          <p className={styles.note}>
            Example only, not typical earnings. The cleanup must be approved and
            the contributions must qualify.
          </p>
        </div>
        <p>
          Reporting alone does not guarantee payment. There is no reporter
          reward for a rejected cleanup, refunded funding, or a cleanup with no
          eligible contributions. Contributions under the fee introduced October
          21, 2026 qualify.
        </p>
        <p>
          To receive rewards, you must be at least 18 and have an eligible US
          Stripe payout account. Reporter transfers follow the cleaner’s
          successful transfer. If your setup is incomplete, an earned reward
          waits; a transfer to Stripe is separate from arrival in your bank.
        </p>
        <p>
          <Link href="/cleanup-policy">
            Read the full cleanup and reward policy
          </Link>{' '}
          for eligibility, reviews, disputes, and payment conditions.
        </p>
      </section>
      <section>
        <h2>What if nobody cleans it?</h2>
        <p>
          A report stays active for 30 days. You can actively renew it for
          another 30 days. If it expires, you have seven days to renew it with
          its cleanup fund intact or close it for refunds. If you take no action
          in that window, the report closes and refunds begin. Its public page stays in past reports, marked expired, without active cleanup or funding options.
        </p>
        <p>
          No one is guaranteed to fund or claim a report. Keep its details
          accurate and share its public link with people who may want to help.
          Once cleanup evidence passes review, you have up to 48 hours to
          approve or dispute it in your account. If you take no action, the
          cleanup is automatically approved when that window expires. An open
          dispute pauses the reward.
        </p>
      </section>
      {proof && <CleanupProof report={proof} />}
      <section>
        <h2>See a spot that needs attention?</h2>
        <p>
          Start with a clear photo and the right location. Your report gives the
          next person a place to begin.
        </p>
        <Link className="primary-button button-link" href="/report">
          Report litter
        </Link>
      </section>
    </Guide>
  );
}
