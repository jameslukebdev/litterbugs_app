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
      summary="This policy describes the information Litterbugs uses to operate community reports, funded cleanups, payments, safety reviews, and account support."
      effectiveDate="August 27, 2026"
      sections={[
        {
          title: 'Information we use',
          content: <>
            <p>Litterbugs may process account identifiers, email address, profile details, authentication records, reports, approximate and precise report locations, photos, cleanup evidence, device and notification information, support requests, blocked-user choices, and account safety records.</p>
            <p>For funded cleanups, Litterbugs also stores contribution and reward amounts, Stripe transaction identifiers and statuses, refund and dispute state, cleaner payout readiness, administrator decisions, and an append-only audit history. We do not store full card or bank-account numbers.</p>
          </>,
        },
        {
          title: 'How information is used',
          content: <ul>
            <li>Operate accounts, maps, reports, cleanup claims, notifications, and completed-cleanup history.</li>
            <li>Assess whether report and cleanup photos support a funded transaction.</li>
            <li>Process contributions, refunds, disputes, cleaner onboarding, and rewards.</li>
            <li>Prevent fraud, duplicate evidence, unsafe cleanups, unauthorized administration, and financial errors.</li>
            <li>Comply with legal, tax, payment-network, and App Store requirements.</li>
          </ul>,
        },
        {
          title: 'Automated photo review',
          content: <>
            <p>Eligible report photos and funded-cleanup evidence may be sent through a private server connection to Google Gemini for a structured review. Gemini is used to identify clear, blurry, unrelated, duplicate, manipulated, hazardous, or ambiguous evidence and to suggest better photos.</p>
            <p>Gemini does not approve payment by itself. Its result is validated by Litterbugs and may open an administrator case. Litterbugs uses Google’s paid service and does not opt into model-data sharing. Authorized administrators may view relevant photos and review reasons when a case requires human action.</p>
          </>,
        },
        {
          title: 'Service providers and disclosure',
          content: <>
            <p>Litterbugs uses Supabase for authentication, databases, private photo storage, and server functions; Stripe for cards, Apple Pay, identity verification, connected payout accounts, refunds, disputes, and transfers; Google for maps and Gemini photo review; and hosting and notification providers needed to operate the app.</p>
            <p>Information may also be disclosed when required by law, to protect users or the service, to investigate fraud or safety issues, or as part of a business transfer subject to appropriate safeguards. Litterbugs does not sell personal information or use it for third-party advertising.</p>
          </>,
        },
        {
          title: 'Retention and choices',
          content: <>
            <p>Information is retained for as long as needed to operate the service, preserve community report history, complete payments and refunds, resolve disputes, prevent abuse, and satisfy financial or legal recordkeeping requirements. Account deletion removes the account and uploaded identity-linked photos where permitted; community report information may remain without the user’s identity.</p>
            <p>You may review profile information in the app, control notification permissions through your device, block other accounts, and delete your account from Profile. Contact <strong>jameslukeb.evj@gmail.com</strong> for privacy questions or data requests.</p>
          </>,
        },
        {
          title: 'Security and children',
          content: <>
            <p>Litterbugs uses access controls, private storage, signed links, multi-factor administrator access, and server-side payment and AI workflows. No online system can guarantee absolute security.</p>
            <p>Funded cleaner payouts are limited to adults age 18 or older. Litterbugs is not directed to children under 13, and we do not knowingly collect their personal information.</p>
          </>,
        },
      ]}
    />
  );
}
