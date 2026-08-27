import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Cleanup Policy | Litterbugs',
  description: 'Safety, photo review, disputes, and cleaner reward rules for Litterbugs cleanups.',
};

export default function CleanupPolicyPage() {
  return (
    <LegalPage
      eyebrow="CLEANUP SAFETY"
      title="Cleanup and reward policy"
      summary="A plain-language guide to safe participation, photo evidence, automated review, disputes, and cleaner rewards."
      effectiveDate="August 27, 2026"
      sections={[
        {
          title: 'Choose safety first',
          content: <ul>
            <li>Use gloves, suitable clothing, and other protective equipment.</li>
            <li>Park safely and lawfully before using Litterbugs or beginning a cleanup.</li>
            <li>Do not enter traffic, unstable terrain, restricted areas, or private property without permission.</li>
            <li>Do not handle needles, syringes, chemicals, biological waste, weapons, or unidentified hazardous material.</li>
            <li>Follow local disposal rules and stop immediately when conditions become unsafe.</li>
            <li>Contact the appropriate local authority for hazardous waste or an immediate danger.</li>
          </ul>,
        },
        {
          title: 'Funded cleanup evidence',
          content: <>
            <p>Submit one to three clear after-cleanup photos that show the reported place and the completed work. Another angle may be needed when one image cannot show the result. Reusing an original report photo as cleanup evidence is prohibited.</p>
            <p>Gemini reviews the evidence first and may ask for better photos twice. A third inconclusive result, suspected manipulation, hazardous scene, system failure, or ambiguous evidence goes to an administrator. Automated review never releases money.</p>
          </>,
        },
        {
          title: 'Disputes and administrator decisions',
          content: <>
            <p>After evidence passes, the reporter has 48 hours to dispute the cleanup. A dispute pauses the reward. Administrators must record a reason and confirmation for financial or rejection actions, and their decision is preserved in the audit history.</p>
            <p>If the cleanup is upheld, Litterbugs completes it and transfers the frozen reward. If it is rejected, the cleaner loses the claim, the report reopens, and the existing fund remains available for another eligible cleaner.</p>
          </>,
        },
        {
          title: 'Independent participation',
          content: <>
            <p>Claiming a cleanup is voluntary. Cleaners decide whether conditions are safe, supply their own equipment, and are responsible for following applicable laws and disposal rules. Cleaners are independent participants, not employees or agents of Litterbugs or Burrow Base LLC.</p>
            <p>Paid self-cleanups are allowed, but they receive no early approval and must complete the same automated review, 48-hour dispute period, and any required administrator checks.</p>
          </>,
        },
      ]}
    />
  );
}
