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
      summary="These terms govern Litterbugs accounts, community reports, cleanup funding, cleaner rewards, safety, reviews, disputes, and refunds."
      effectiveDate="August 27, 2026"
      sections={[
        {
          title: 'Agreement and who may use Litterbugs',
          content: <>
            <p>These Terms of Use form an agreement between you and Burrow Base LLC, the operator of Litterbugs. By creating an account or using Litterbugs, you agree to these terms, the Privacy Policy, and the Cleanup, Contribution, Reward, Dispute, and Refund Policy. If you do not agree, do not use the service.</p>
            <p>You must be at least 13 years old to create an account and, if you are under the age of legal majority where you live, have permission from a parent or legal guardian. You must provide accurate information, keep your account secure, and use Litterbugs lawfully. A permanent Litterbugs account is required to report litter, contribute money, claim a cleanup, dispute a cleanup, or receive a reward. Funded cleaners must be at least 18 years old, be in the United States, and satisfy Stripe&apos;s identity, eligibility, tax-information, and payout requirements.</p>
          </>,
        },
        {
          title: 'What Litterbugs does—and does not do',
          content: <>
            <p>Litterbugs lets members identify litter, contribute to cleanup reward pools, and voluntarily claim cleanups. Litterbugs is not a charity, donation platform, employer, waste-removal contractor, emergency service, environmental regulator, insurer, or hazardous-material service.</p>
            <p>Reports and user content may be incomplete or inaccurate. Litterbugs does not inspect cleanup locations, control site conditions, supply equipment, direct the cleaner&apos;s physical work, guarantee that a report will be cleaned, or guarantee that any location or cleanup is safe or lawful.</p>
          </>,
        },
        {
          title: 'Reports and member content',
          content: <>
            <p>You are responsible for reports, photos, descriptions, disputes, and other content you submit. You represent that your content is accurate to the best of your knowledge, is relevant to the reported location, does not violate another person&apos;s rights, and may lawfully be submitted.</p>
            <p>You give Litterbugs a worldwide, nonexclusive, royalty-free license to host, reproduce, process, display, adapt, and use submitted content as needed to operate, secure, improve, and promote the service. This license does not transfer ownership of your content. Avoid including faces, license plates, private documents, or other unnecessary personal information in photos.</p>
          </>,
        },
        {
          title: 'Contributions and the 10% Litterbugs fee',
          content: <>
            <p>A logged-in member may add between <strong>$5 and $5,000 per transaction</strong> to an active, eligible cleanup report. The reporter does not have to contribute. Before payment, Litterbugs shows the principal added to the cleaner reward, a separate 10% Litterbugs platform fee, and the total charge. For example, a $20 principal contribution has a $2 platform fee and a $22 total charge.</p>
            <p>The displayed cleaner reward is the total contribution principal, not the total charged. If an eligible cleanup is approved, the cleaner receives that exact frozen principal. Litterbugs retains the 10% fee and absorbs standard Stripe processing, payout, refund, and chargeback costs. Contributions are not charitable donations and are not represented as tax deductible.</p>
            <p>A successful contribution remains assigned to the report until paid to an approved cleaner or refunded under the published rules. A contributor cannot cancel, withdraw, or opt out merely because they changed their mind.</p>
          </>,
        },
        {
          title: 'Report duration, renewal, and closing',
          content: <>
            <p>An eligible report remains active for 30 days and may be actively renewed by its reporter for additional 30-day periods without a fixed renewal limit. Funding may continue while the report remains active.</p>
            <p>When a report expires, it leaves the active map and stops accepting contributions or new claims. The reporter then has seven days to renew it, carrying the full reward pool forward, or close it for refunds. If the reporter takes no action during that window, the report closes and refunds begin.</p>
          </>,
        },
        {
          title: 'Cleanup claims, evidence, and approval',
          content: <>
            <ul>
              <li>The first successful contribution locks the report&apos;s location and original evidence.</li>
              <li>When a cleaner claims a funded report, contributions stop and the reward is frozen for that attempt.</li>
              <li>The cleaner has 24 hours to complete the cleanup and submit one to three suitable after photos.</li>
              <li>Reused report photos, unrelated locations, manipulated evidence, and fraud are prohibited.</li>
              <li>Gemini performs an initial structured photo review and may request better photos or send the case to an administrator. It never releases money.</li>
              <li>A funded cleaner may be asked for better photos twice. A third inconclusive result is escalated to an administrator.</li>
              <li>After evidence passes, the reporter has 48 hours to dispute. There is no early funded payout.</li>
              <li>The cleaner&apos;s first paid cleanup receives a lightweight administrator check.</li>
            </ul>
            <p>A reporter may clean their own report and receive the reward, but receives no special treatment or early approval. The same evidence, Gemini, dispute-window, first-paid-cleanup, and administrator rules apply.</p>
          </>,
        },
        {
          title: 'Safety, assumption of risk, and independent participation',
          content: <>
            <p>Claiming and performing a cleanup is voluntary. Before every claim, you must review and accept the current Cleanup Safety, Assumption of Risk, and Funded Reward Acknowledgment. You decide whether conditions are safe, supply your own transportation, tools, protective equipment, and disposal arrangements, and must stop when a condition is unsafe or beyond your ability.</p>
            <p>Cleaners are independent participants, not employees, agents, partners, or representatives of Litterbugs or Burrow Base LLC. Litterbugs does not control how a cleaner performs physical work. To the fullest extent permitted by law, you assume the risks identified in the acknowledgment and release the Litterbugs parties from claims arising from your voluntary participation, including claims based on ordinary negligence. This does not release gross negligence, willful misconduct, or liability that cannot lawfully be waived.</p>
          </>,
        },
        {
          title: 'Disputes and administrator decisions',
          content: <>
            <p>A reporter may dispute a cleanup during the 48-hour window. An open dispute blocks payout. An authorized administrator may review the report, before and after photos, Gemini findings, cleaner description and history, payment state, reporter reason, and audit history.</p>
            <p>Denying a dispute lets the normal reward process continue. Upholding it rejects that cleanup attempt and reopens the report. If the administrator also closes the report, the defined refunds begin. Administrators must record a reason for financial and rejection decisions. Litterbugs may correct clerical or processing errors and may pause a case when information is incomplete.</p>
          </>,
        },
        {
          title: 'Refunds, payment failures, and chargebacks',
          content: <>
            <p>Litterbugs refunds each active contributor&apos;s complete original charge, including principal and the 10% fee, when the reporter closes an expired report, takes no action during its seven-day decision window, or the contribution remains unused for 23 months. Refunds return to the original payment method and may take additional provider-dependent time to appear.</p>
            <p>Refund, chargeback, or payment inconsistencies may freeze the related pool, cleanup, transfer, or account while Litterbugs reconciles the records. A contributor&apos;s chargeback does not change the published refund rules and may lead to account restrictions if it is abusive or fraudulent.</p>
          </>,
        },
        {
          title: 'Cleaner rewards, Stripe, and taxes',
          content: <>
            <p>After the dispute window and all required reviews, Litterbugs transfers the frozen principal through Stripe Connect. Stripe hosts identity, tax-information, bank, and payout onboarding. Litterbugs does not store full card or bank-account numbers.</p>
            <p>A displayed reward is not guaranteed until the cleanup satisfies the evidence, dispute, administrator, fraud, reconciliation, and Stripe eligibility requirements. Stripe or Litterbugs may delay or withhold a transfer when required by law, sanctions, provider rules, identity requirements, fraud controls, disputes, or financial reconciliation.</p>
            <p>Cleaners are responsible for determining and reporting taxes associated with rewards. Stripe or Litterbugs may collect required tax information and issue required forms.</p>
          </>,
        },
        {
          title: 'Gemini photo processing and human review',
          content: <>
            <p>Eligible report and cleanup photos may be processed through Google Gemini to assess image clarity, location and scene consistency, cleanup progress, duplicated or manipulated evidence, and possible hazards. AI results can be inaccurate. Litterbugs validates structured results and may override or escalate them to an authorized administrator.</p>
            <p>Gemini does not make final legal, safety, employment, fraud, dispute, refund, or payout decisions and cannot independently release money. Additional information appears in the Privacy Policy.</p>
          </>,
        },
        {
          title: 'Prohibited conduct and enforcement',
          content: <>
            <p>You may not misuse the service, trespass, submit false or infringing content, manipulate evidence, impersonate another person, create duplicate or coordinated accounts to evade rules, interfere with security, scrape protected data, exploit payment flows, harass another member, or use Litterbugs for unlawful activity.</p>
            <p>Litterbugs may remove content; restrict reports, contributions, claims, disputes, rewards, or accounts; preserve evidence; and cooperate with providers or authorities when reasonably needed to enforce these terms, investigate fraud or safety issues, comply with law, or protect the service and its users.</p>
          </>,
        },
        {
          title: 'Disclaimers and limits of liability',
          content: <>
            <p>To the fullest extent permitted by law, Litterbugs is provided “as is” and “as available.” Burrow Base LLC disclaims implied warranties of merchantability, fitness for a particular purpose, title, and noninfringement. We do not promise uninterrupted operation, accurate user content, a safe cleanup site, a successful cleanup, or a particular AI or administrator outcome.</p>
            <p>To the fullest extent permitted by law, Burrow Base LLC and the Litterbugs parties will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, lost profits, lost data, personal injury, property damage, or losses arising from user content, site conditions, voluntary cleanups, another user, or a third-party provider. Any liability that cannot be excluded is limited to the greater of $100 or the platform fees you paid to Litterbugs during the six months before the event giving rise to the claim. These limits do not reduce a valid refund owed under the Cleanup and Reward Policy or an approved cleaner reward that Litterbugs is obligated to transfer. The limits do not apply where prohibited by law.</p>
          </>,
        },
        {
          title: 'Indemnity',
          content: <p>To the fullest extent permitted by law, you agree to defend, indemnify, and hold harmless Burrow Base LLC and the Litterbugs parties from third-party claims, losses, and reasonable costs arising from your content, your violation of these terms or law, your cleanup activity, your disposal of material, or your infringement of another person&apos;s rights. This obligation does not require you to indemnify a party for its own gross negligence or willful misconduct.</p>,
        },
        {
          title: 'Governing law and disputes with Litterbugs',
          content: <>
            <p>Before filing a claim against Burrow Base LLC, you agree to send a written description to <strong>jameslukeb.evj@gmail.com</strong> and allow 30 days for an informal resolution, unless immediate relief is legally necessary. These terms are governed by North Carolina law, without regard to conflict-of-law rules.</p>
            <p>Unless applicable law requires otherwise, disputes between you and Burrow Base LLC will be brought individually in the state or federal courts having jurisdiction in North Carolina. Nothing in these terms limits rights that cannot legally be waived, including eligible small-claims or consumer-protection rights.</p>
          </>,
        },
        {
          title: 'Changes, severability, and contact',
          content: <>
            <p>We may update these terms as the service changes. Material changes will be posted with a new effective date and, when appropriate, require notice or renewed acceptance. Changes do not retroactively alter a completed transaction except where required by law or needed to correct an error.</p>
            <p>If a provision is unenforceable, the remaining provisions continue to the extent permitted by law. A failure to enforce a provision is not a waiver. These terms and the policies they incorporate are the entire agreement about the service and may not be assigned by you without our consent.</p>
            <p>Contact Burrow Base LLC at <strong>jameslukeb.evj@gmail.com</strong>.</p>
          </>,
        },
      ]}
    />
  );
}
