import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Terms | Litterbugs',
  description: 'Terms for Litterbugs reports, funded cleanups, contributions, and rewards.',
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="LITTERBUGS TERMS"
      title="Terms of use"
      summary="These terms explain how reports, cleanup funding, cleaner rewards, reviews, disputes, and refunds work in the Litterbugs MVP."
      effectiveDate="August 27, 2026"
      sections={[
        {
          title: 'Using Litterbugs',
          content: <>
            <p>Litterbugs is operated by Burrow Base LLC. Members must provide accurate account information and use reports, photos, locations, and community features lawfully. A Litterbugs account is required to contribute money, report litter, claim a cleanup, or receive a reward.</p>
            <p>Cleaners receiving funded rewards must be at least 18 years old, located in the United States, and complete Stripe’s identity and payout requirements. Cleaners act independently; they are not employees of Litterbugs or Burrow Base LLC.</p>
          </>,
        },
        {
          title: 'Contributions and the 10% fee',
          content: <>
            <p>A member may add between <strong>$5 and $5,000 per transaction</strong> to an active, eligible cleanup report. Before payment, Litterbugs shows the amount added to the cleaner reward, the separate 10% Litterbugs fee, and the total charge.</p>
            <p>The contribution principal becomes the displayed cleanup reward. The cleaner receives that exact frozen principal if the cleanup is approved. Litterbugs retains the 10% fee and absorbs Stripe processing costs. A contribution is not a charitable donation and should not be treated as tax deductible.</p>
            <p>Successful contributions cannot be withdrawn at a contributor’s request. They remain assigned to the report until an approved cleanup is paid or one of the refund conditions below occurs.</p>
          </>,
        },
        {
          title: 'Reports, claims, and approval',
          content: <>
            <ul>
              <li>Reports remain active for 30 days and may be renewed for additional 30-day periods by the reporter.</li>
              <li>The first successful contribution locks the report’s location and original cleanup evidence.</li>
              <li>When a cleaner claims a funded report, contributions stop and the reward is frozen for that attempt.</li>
              <li>The cleaner has 24 hours to complete the cleanup and submit suitable photo evidence.</li>
              <li>Gemini performs an initial structured photo review. It may request better photos or send the case to an administrator; it never releases money.</li>
              <li>After the evidence passes, the reporter has 48 hours to dispute. There is no early approval for funded cleanups.</li>
              <li>The cleaner’s first paid cleanup requires a lightweight administrator check.</li>
            </ul>
            <p>A reporter may clean their own report, but the same review, dispute, and administrator rules apply. Litterbugs may pause or reject a payout when evidence, safety, fraud, sanctions, identity, or payment concerns require review.</p>
          </>,
        },
        {
          title: 'Refunds and disputes',
          content: <>
            <p>An expired report is hidden and cannot receive contributions or new claims. The reporter has seven days to renew it or close it. Closing it—or taking no action for seven days—refunds each active contributor’s complete original charge, including the 10% fee. A contribution still unused after 23 months is also refunded in full.</p>
            <p>Refunds return to the original payment method and may take additional time to appear. Failed refunds are retried and placed in the administrator queue. Litterbugs absorbs refund fees and chargebacks.</p>
            <p>Reporter disputes and inconclusive or suspicious evidence pause the reward. An authorized Litterbugs administrator reviews the available photos, automated review reasons, payment state, and audit history, then either upholds the cleanup or rejects it and reopens the report.</p>
          </>,
        },
        {
          title: 'Cleaner payments and taxes',
          content: <>
            <p>Stripe provides hosted identity, bank, and payout setup. Litterbugs does not store a cleaner’s full bank information. Standard payouts are used so payout fees do not reduce the reward shown in Litterbugs.</p>
            <p>Cleaners are responsible for determining and reporting taxes associated with rewards. Stripe or Litterbugs may collect required tax information or issue tax forms. Litterbugs may withhold or delay payment when required by law or Stripe’s compliance rules.</p>
          </>,
        },
        {
          title: 'Safety and account enforcement',
          content: <>
            <p>Cleanup participation is voluntary. Cleaners must follow the current Cleanup Safety and Funded Reward Acknowledgment, applicable laws, property rules, disposal requirements, and instructions from public authorities. Do not enter traffic, trespass, or handle needles, chemicals, biological waste, or other hazardous material.</p>
            <p>Litterbugs may restrict or close accounts, reports, contributions, claims, or payouts to protect users, investigate misuse, comply with law, or enforce these terms. Contact <strong>jameslukeb.evj@gmail.com</strong> with questions.</p>
          </>,
        },
      ]}
    />
  );
}
