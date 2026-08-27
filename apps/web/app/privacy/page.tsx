import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Privacy | Litterbugs',
  description: 'How Litterbugs handles account, report, payment, and cleanup-review data.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="LITTERBUGS PRIVACY"
      title="Privacy policy"
      summary="This policy explains how Burrow Base LLC collects, uses, shares, and protects information when operating Litterbugs."
      effectiveDate="August 27, 2026"
      sections={[
        {
          title: 'Scope and responsible company',
          content: <p>This Privacy Policy applies to Litterbugs websites, mobile applications, reports, cleanup funding, rewards, support, and administrator review operated by Burrow Base LLC. It does not control the independent privacy practices of Stripe, Google, Apple, payment networks, or other services you choose to use.</p>,
        },
        {
          title: 'Information you provide',
          content: <ul>
            <li>Account identifiers, email address, profile details, authentication choices, and support communications.</li>
            <li>Litter reports, descriptions, approximate or precise report locations, photos, cleanup evidence, and dispute reasons.</li>
            <li>Notification preferences, blocked-user choices, and safety or moderation reports.</li>
            <li>Information submitted to Stripe during cleaner onboarding, although Litterbugs does not receive or store full card or bank-account numbers.</li>
          </ul>,
        },
        {
          title: 'Information created when you use Litterbugs',
          content: <ul>
            <li>Device, operating-system, app-version, session, authentication, notification-token, error, and security information.</li>
            <li>Report, claim, submission, review, dispute, administrator-decision, and completed-cleanup history.</li>
            <li>Contribution and reward amounts; Stripe customer, PaymentIntent, charge, refund, transfer, and connected-account identifiers and statuses; and payout-readiness state.</li>
            <li>Append-only financial and administrator audit records used to reconcile transactions, prevent fraud, and explain decisions.</li>
          </ul>,
        },
        {
          title: 'How we use information',
          content: <ul>
            <li>Operate accounts, maps, reports, claims, notifications, contribution pools, refunds, disputes, and cleaner rewards.</li>
            <li>Assess whether reports are eligible for funding and whether cleanup photos support a funded transaction.</li>
            <li>Provide support, enforce our rules, protect users, investigate suspected fraud or unsafe activity, and secure the service.</li>
            <li>Reconcile payment records and comply with legal, tax, sanctions, payment-network, and App Store requirements.</li>
            <li>Analyze and improve reliability, accessibility, usability, and the performance of Litterbugs.</li>
          </ul>,
        },
        {
          title: 'Photos, locations, and Gemini review',
          content: <>
            <p>Report and cleanup photos may contain personal information, and report locations may be approximate or precise. Avoid photographing faces, license plates, private documents, homes beyond what is necessary, or other unrelated personal information.</p>
            <p>Eligible photos may be provided through short-lived private references to a dedicated Google Cloud relay for paid Google Gemini review. Gemini may assess clarity, scene consistency, cleanup progress, duplicate or manipulated evidence, and possible hazards, then return structured findings to Litterbugs. Litterbugs does not opt into voluntary model-data sharing for this production workflow.</p>
            <p>Gemini does not independently release money. Litterbugs validates its result, and authorized administrators may view the relevant report, photos, reasons, and payment state to override or resolve an ambiguous, disputed, unsafe, or suspicious case. AI output may be inaccurate.</p>
          </>,
        },
        {
          title: 'Payments and Stripe',
          content: <>
            <p>Stripe processes card and wallet payments, identity and payout onboarding, connected accounts, refunds, disputes, transfers, and related compliance. Stripe may collect payment-card, bank-account, identity, tax, device, and fraud-prevention information under its own privacy policy.</p>
            <p>Litterbugs receives transaction identifiers, amounts, statuses, limited account details, and payout-readiness information needed to operate and reconcile the service. We do not store full card or bank-account numbers.</p>
          </>,
        },
        {
          title: 'Other service providers and disclosures',
          content: <>
            <p>Supabase supports authentication, databases, private photo storage, and server functions. Google supports maps, Cloud Run, and Gemini review. Hosting, email, and notification providers support delivery and reliability. These providers may process information only as needed to provide their services, subject to their agreements and applicable law.</p>
            <p>We may disclose information when required by law; to respond to lawful process; to protect users, rights, safety, property, or the service; to investigate fraud or security incidents; or in a merger, financing, reorganization, or sale subject to appropriate handling of personal information. We do not sell personal information or use it for third-party behavioral advertising.</p>
          </>,
        },
        {
          title: 'Public and member-visible information',
          content: <p>Report facts, general locations, report photos, cleanup status, and accepted cleanup evidence may be visible to other members or the public as part of the community map and completed-cleanup history. Pending private cleanup evidence is limited to the cleaner, reporter, authorized reviewers, and service providers needed for review. Do not submit information you do not want processed for these purposes.</p>,
        },
        {
          title: 'Retention',
          content: <>
            <p>We retain information for as long as reasonably needed to operate reports and cleanup history, complete payments and refunds, resolve disputes, prevent abuse, maintain audit trails, and satisfy tax, financial, legal, and provider requirements. Retention varies by record type and may continue after account deletion when necessary for those purposes.</p>
            <p>Backups and provider systems may retain information for an additional limited period under their normal safeguards and deletion cycles. We do not promise deletion from a third party sooner than its applicable contractual, technical, or legal process permits.</p>
          </>,
        },
        {
          title: 'Your choices and privacy requests',
          content: <>
            <p>You may review or update profile information in the app, control device permissions and notifications, block other accounts, and request account deletion from Profile. Account deletion removes the account and identity-linked uploaded photos where permitted. Community report facts may remain after de-identification, and financial, dispute, safety, fraud, tax, and legal records may be retained when required.</p>
            <p>Depending on where you live and whether an applicable law&apos;s thresholds are met, you may have rights to request access, correction, deletion, or a copy of certain personal information, or to appeal a denied request. Litterbugs does not sell personal information or process it for targeted advertising. Send requests to <strong>jameslukeb.evj@gmail.com</strong>. We may verify your identity before acting.</p>
          </>,
        },
        {
          title: 'Security and international processing',
          content: <>
            <p>Litterbugs uses access controls, private storage, short-lived signed references, multi-factor administrator access, server-side financial workflows, and audit records. No online service can guarantee absolute security.</p>
            <p>Litterbugs is operated in the United States, and service providers may process information in the United States or other locations where they operate. Their privacy protections and legal requirements may differ from those in your location.</p>
          </>,
        },
        {
          title: 'Children',
          content: <p>Litterbugs is not directed to children under 13, and we do not knowingly collect personal information from them. Cleanup claims are limited to adults age 18 or older. If you believe a child has submitted personal information, contact us.</p>,
        },
        {
          title: 'Changes and contact',
          content: <>
            <p>We may update this policy as Litterbugs or applicable requirements change. We will post the updated policy with a new effective date and provide additional notice when appropriate.</p>
            <p>For privacy questions or requests, contact Burrow Base LLC at <strong>jameslukeb.evj@gmail.com</strong>.</p>
          </>,
        },
      ]}
    />
  );
}
