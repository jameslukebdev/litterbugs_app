/* eslint-disable @next/next/no-img-element -- tiny decorative brand marks, like BrandBug. */
import { FiCheckCircle } from 'react-icons/fi';
import { BugCelebration } from '@/components/bug-celebration';
import { PayoutTrust } from '@/components/payout-trust';
import payoutStyles from '@/components/payout-trust.module.css';
import type { PayoutStatus } from '@/lib/funding';

type Stage = 'loading' | 'not_started' | 'pending' | 'restricted' | 'enabled';

const STAGE: Record<Exclude<Stage, 'loading'>, { title: string; button: string }> = {
  not_started: {
    title: 'Get paid for cleanups',
    button: 'Add bank with Stripe',
  },
  pending: {
    title: 'Almost there',
    button: 'Review details',
  },
  restricted: {
    title: 'Stripe needs a few more details',
    button: 'Finish setup',
  },
  enabled: {
    title: 'Payouts are ready',
    button: 'Manage payouts',
  },
};

export function payoutNeedsConfirmation(status: PayoutStatus | null) {
  const stage = payoutStage(status);
  return stage === 'not_started' || (stage !== 'enabled' && stage !== 'loading' && status?.age18Confirmed !== true);
}

export function payoutStage(status: PayoutStatus | null): Stage {
  if (!status) return 'loading';
  if (status.payoutsEnabled) return 'enabled';
  return status.onboardingStatus === 'enabled' ? 'pending' : status.onboardingStatus;
}

/**
 * Payout setup in plain words: where you are (not set up / in progress / needs info / ready), one
 * confirmation, and one button that opens Stripe's form inside Litterbugs. Earn family green, like the cleaner flow.
 */
export function PayoutPanel({ status, eligibleConfirmed, onEligible, busy, openingStripe = false, message, onContinue, onFallback, celebrate = false, inline = false, confirmed = false }: {
  status: PayoutStatus | null; eligibleConfirmed: boolean; onEligible: (value: boolean) => void;
  busy: boolean; openingStripe?: boolean; message: string; onContinue: () => void; onFallback?: () => void; celebrate?: boolean; inline?: boolean;
  /** Eligibility was already confirmed on the page, so this screen never asks again. */
  confirmed?: boolean;
}) {
  const stage = payoutStage(status);
  const bankAlreadyShown = inline && stage === 'enabled';
  const startingBankSetup = inline && stage === 'not_started';
  const copy = stage === 'loading' ? null : STAGE[stage];
  // Only a first-time setup asks for the age/eligibility confirmation; anyone already part-way through
  // confirmed it when they started (the server keeps that record).
  const needsConfirm = !confirmed && payoutNeedsConfirmation(status);
  return (
    <div className="payout-flow">
      {!bankAlreadyShown && <header className="payout-head">
        {celebrate && stage === 'enabled' && <BugCelebration down />}
        <img src="/brand/ranks/caterpillar.svg" alt="" aria-hidden="true" width={42} height={42} />
        {/* First time ready: the title is the celebration, so nothing else repeats it. */}
        <h2>{celebrate && stage === 'enabled' ? 'You’re all set to earn cash' : startingBankSetup ? 'Bank setup' : copy?.title ?? 'Payout settings'}</h2>
      </header>}
      {/* No intro line under the title: each screen says only what the title doesn't. */}
      {stage === 'enabled' && !bankAlreadyShown && <p className={payoutStyles.readyLine}><FiCheckCircle aria-hidden="true" />Cash from approved cleanups goes to the bank account you added with Stripe.</p>}
      {stage === 'restricted' && status && status.requirementsDue.length > 0 && <p className="payout-note">Stripe is asking for {status.requirementsDue.length} more {status.requirementsDue.length === 1 ? 'detail' : 'details'}.</p>}
      {needsConfirm && (
        <label className="cleaner-check payout-check">
          <input type="checkbox" checked={eligibleConfirmed} onChange={event => onEligible(event.target.checked)} />
          <span>I’m at least 18 and eligible to receive payouts in the United States.</span>
        </label>
      )}
      {message && <p className="form-message error-message" role="alert">{message}</p>}
      {/* Nothing is left to do once payouts are ready, so Manage is a quieter button. */}
      <button className={stage === 'enabled' ? `secondary-button ${payoutStyles.manage}` : 'primary-button payout-go'} onClick={onContinue} disabled={busy || (needsConfirm && !eligibleConfirmed)}>
        {stage === 'enabled' && openingStripe ? 'Opening Stripe…' : bankAlreadyShown ? 'Manage payouts' : startingBankSetup ? 'Add bank with Stripe' : copy?.button ?? 'Try again'}
      </button>
      {message && onFallback && <button className="secondary-button" disabled={busy || !status || (needsConfirm && !eligibleConfirmed)} onClick={onFallback}>{openingStripe ? 'Opening Stripe…' : 'Continue on Stripe'}</button>}
      <PayoutTrust />
    </div>
  );
}
