import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Cleanup Policy | Litterbugs',
  description: 'Contribution, safety, photo review, dispute, refund, and cleaner reward rules.',
};

export default function CleanupPolicyPage() {
  return (
    <LegalPage
      activePath="/cleanup-policy"
      eyebrow="CLEANUP, FUNDING & SAFETY"
      title="Cleanup and reward policy"
      summary="The plain-language rules for contributions, report pools, safe participation, evidence review, disputes, refunds, and cleaner rewards."
      effectiveDate="August 27, 2026"
      sections={[
        {
          title: 'Contributions and the displayed reward',
          content: <>
            <p>A logged-in member may add $5 to $5,000 of principal per transaction to an active, eligible report. Litterbugs adds a separate 10% platform fee and shows the principal, fee, and total before payment. Contributions are not charitable donations and are not represented as tax deductible.</p>
            <p>The cleaner reward shows only the contributed principal. An approved cleaner receives that exact frozen principal. Litterbugs keeps the separate 10% fee and absorbs standard payment, payout, refund, and chargeback costs.</p>
          </>,
        },
        {
          title: 'How long a report and its pool remain active',
          content: <>
            <p>A report remains active for 30 days. Its reporter may actively renew it for another 30 days, with no fixed limit on active renewals. Contributions may continue for as long as the report remains active.</p>
            <p>When the report expires, it leaves the active map. The reporter has seven days to renew it, carrying the entire pool forward, or close it for refunds. Taking no action during those seven days closes the report and starts refunds.</p>
          </>,
        },
        {
          title: 'Claiming a cleanup',
          content: <>
            <p>When an eligible cleaner claims a report, contributions stop and any funded reward is frozen for that attempt. The cleaner has 24 hours to complete the cleanup and submit evidence. A reporter may clean their own report and receive its reward, but the same review, dispute, and administrator rules apply.</p>
            <p>Before every claim, the cleaner must be at least 18 and review and explicitly accept the current Cleanup Safety, Assumption of Risk, and Funded Reward Acknowledgment. Funded cleaners must also be in the United States and be eligible for Stripe payouts.</p>
          </>,
        },
        {
          title: 'Choose safety first',
          content: <ul>
            <li>Park safely and lawfully before opening Litterbugs. Never use the app while driving.</li>
            <li>Wear suitable gloves, clothing, footwear, and any other protective equipment the cleanup requires.</li>
            <li>Stay out of traffic, roadways, railroads, waterways, unstable terrain, construction zones, restricted areas, and private property without permission.</li>
            <li>Never handle needles, chemicals, biological or medical waste, damaged batteries, weapons, explosives, pressurized containers, unknown liquids or powders, or anything else hazardous or unidentified.</li>
            <li>Do not confront people, disturb encampments, move suspicious property, or perform work requiring specialized training or licensed disposal.</li>
            <li>Follow local laws and disposal rules. Contact emergency services or the appropriate public authority for immediate danger or hazardous waste.</li>
            <li>Stop or decline the cleanup whenever conditions are unsafe or beyond your ability.</li>
          </ul>,
        },
        {
          title: 'Cleanup evidence',
          content: <>
            <p>Submit one to three clear after photos that show the reported place and completed work. Include another angle when one image cannot show the result. Reusing an original report photo, showing an unrelated location, manipulating evidence, or submitting fraudulent or misleading photos is prohibited.</p>
            <p>Do not include unnecessary faces, license plates, private documents, or other personal information. Keep original evidence available until the cleanup, dispute period, and any review are complete.</p>
          </>,
        },
        {
          title: 'Gemini review and better-photo requests',
          content: <>
            <p>Google Gemini performs the initial structured review of eligible report and cleanup photos. It may accept the evidence for the next workflow step, request better photos, flag possible hazards or manipulation, or send ambiguity to a human administrator. Gemini never independently releases money or makes a final legal, safety, employment, fraud, refund, or dispute decision.</p>
            <p>A funded cleaner may receive two requests for better photos. A third inconclusive result is sent to an administrator rather than creating unlimited retries. System failures, suspicious evidence, possible hazards, and ambiguous results may also be escalated.</p>
          </>,
        },
        {
          title: 'The 48-hour dispute window',
          content: <>
            <p>After the evidence passes, the reporter has 48 hours to dispute. The reporter does not need to approve the cleanup, and there is no early funded payout. An open dispute pauses the reward.</p>
            <p>An authorized administrator reviews the relevant before and after evidence, Gemini findings, cleaner explanation and history, report, payment state, reporter reason, and audit record. Administrators record a reason for financial and rejection actions.</p>
          </>,
        },
        {
          title: 'What administrator decisions mean',
          content: <ul>
            <li><strong>Deny dispute:</strong> the cleanup remains accepted and the normal reward process continues.</li>
            <li><strong>Uphold dispute and reopen report:</strong> the attempt is rejected, the cleaner is not paid for that attempt, and the existing pool becomes available for another eligible cleaner.</li>
            <li><strong>Uphold dispute and close report:</strong> the attempt is rejected, the report closes, and the defined refunds begin.</li>
            <li><strong>Request better photos or hold for review:</strong> no reward is released until the outstanding evidence, safety, fraud, or financial issue is resolved.</li>
          </ul>,
        },
        {
          title: 'Cleaner rewards and taxes',
          content: <>
            <p>After the 48-hour window and all required reviews, Litterbugs transfers the frozen principal through Stripe Connect. The cleaner&apos;s first paid cleanup receives a lightweight administrator check. A displayed reward is not guaranteed until every evidence, dispute, administrator, fraud, reconciliation, and Stripe eligibility requirement is satisfied.</p>
            <p>Stripe provides hosted identity, tax-information, bank, and payout setup. Stripe or Litterbugs may delay or withhold payment when required by law, sanctions, identity requirements, provider rules, fraud controls, disputes, or reconciliation. Cleaners are responsible for determining and reporting taxes related to rewards.</p>
          </>,
        },
        {
          title: 'Refunds',
          content: <>
            <p>Litterbugs returns each contributor&apos;s complete original charge—including the principal and 10% fee—when the reporter closes an expired report, takes no action during the seven-day decision window, or the contribution remains unused for 23 months.</p>
            <p>Refunds return to the original payment method and may take provider-dependent time to appear. A successful contribution cannot be refunded solely because a contributor changes their mind while the report remains active. Failed refunds are held for administrator attention and bounded retry.</p>
          </>,
        },
        {
          title: 'Independent participation and responsibility',
          content: <>
            <p>Cleaners choose whether, when, and how to attempt a cleanup within the claim and evidence rules. They are independent participants, not employees or agents of Litterbugs or Burrow Base LLC. They supply their own transportation, tools, protective equipment, and disposal arrangements and are responsible for following applicable laws and property rules.</p>
            <p>Cleanup activity has real-world risks. The pre-claim acknowledgment explains the assumption of risk and release that applies to voluntary participation. Do not attempt any cleanup that is unsafe, unlawful, requires specialized training, or is beyond your ability.</p>
          </>,
        },
        {
          title: 'Questions',
          content: <p>For a cleanup, contribution, reward, dispute, or refund question, contact Burrow Base LLC at <strong>jameslukeb.evj@gmail.com</strong>.</p>,
        },
      ]}
    />
  );
}
