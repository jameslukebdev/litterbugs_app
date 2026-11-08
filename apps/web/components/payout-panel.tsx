/* eslint-disable @next/next/no-img-element -- tiny decorative brand marks, like BrandBug. */
import { BugCelebration } from '@/components/bug-celebration';
import type { PayoutStatus } from '@/lib/funding';

type Stage = 'loading' | 'not_started' | 'pending' | 'restricted' | 'enabled';

const STAGE: Record<Exclude<Stage, 'loading'>, { title: string; button: string }> = {
  not_started: {
    title: 'Get paid for cleanups',
    button: 'Set up payouts',
  },
  pending: {
    title: 'Almost there',
    button: 'Continue setup',
  },
  restricted: {
    title: 'Stripe needs a little more',
    button: 'Finish setup',
  },
  enabled: {
    title: 'Payouts are ready',
    button: 'Review with Stripe',
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
 * Payout setup in plain words: where you are (not set up / in progress / needs info / ready), what the
 * three steps are, one confirmation, and one button to Stripe. Earn family green, like the cleaner flow.
 */
export function PayoutPanel({ status, eligibleConfirmed, onEligible, busy, message, onContinue, onFallback, celebrate = false }: {
  status: PayoutStatus | null; eligibleConfirmed: boolean; onEligible: (value: boolean) => void;
  busy: boolean; message: string; onContinue: () => void; onFallback?: () => void; celebrate?: boolean;
}) {
  const stage = payoutStage(status);
  const copy = stage === 'loading' ? null : STAGE[stage];
  // Only a first-time setup asks for the age/eligibility confirmation; anyone already part-way through
  // confirmed it when they started (the server keeps that record).
  const needsConfirm = payoutNeedsConfirmation(status);
  return (
    <div className="payout-flow">
      <header className="payout-head">
        {celebrate && stage === 'enabled' && <BugCelebration down />}
        <img src="/brand/ranks/caterpillar.svg" alt="" aria-hidden="true" width={42} height={42} />
        {/* First time ready: the title is the celebration, so nothing else repeats it. */}
        <h2>{celebrate && stage === 'enabled' ? 'You’re all set to earn cash' : copy?.title ?? 'Payout settings'}</h2>
      </header>
      {/* No intro line under the title: each screen says only what the title doesn't. */}
      {stage === 'loading' && !message && <p className="payout-lead" role="status">Checking your payout status…</p>}
      {stage !== 'loading' && stage !== 'enabled' && (
        <ol className="payout-steps">
          <li data-done={stage !== 'not_started' || undefined} data-current={stage === 'not_started' || undefined}><span aria-hidden="true">1</span><div><strong>Confirm you can be paid</strong><small>You&rsquo;re 18 or older and in the United States.</small></div></li>
          <li data-current={stage !== 'not_started' || undefined}><span aria-hidden="true">2</span><div><strong>Add your details with Stripe</strong><small>Your legal name, a code sent to your phone, and your bank details. It takes a few minutes.</small></div></li>
          <li><span aria-hidden="true">3</span><div><strong>Get paid</strong><small>Cash from approved cleanups is paid out to you.</small></div></li>
        </ol>
      )}
      {stage === 'restricted' && status && status.requirementsDue.length > 0 && <p className="payout-note">Stripe is asking for {status.requirementsDue.length} more {status.requirementsDue.length === 1 ? 'detail' : 'details'}.</p>}
      {needsConfirm && (
        <label className="cleaner-check payout-check">
          <input type="checkbox" checked={eligibleConfirmed} onChange={event => onEligible(event.target.checked)} />
          <span>I confirm that I am at least 18 and eligible to receive payouts in the United States.</span>
        </label>
      )}
      {message && <p className="form-message error-message" role="alert">{message}</p>}
      <button className="primary-button payout-go" onClick={onContinue} disabled={busy || !status || (needsConfirm && !eligibleConfirmed)}>
        {busy ? 'Loading…' : copy?.button ?? 'Set up payouts'}
      </button>
      {message && onFallback && <button className="text-button" disabled={busy || !status || (needsConfirm && !eligibleConfirmed)} onClick={onFallback}>Continue on Stripe</button>}
      <p className="payout-stripe-note">Stripe handles your identity and payment details securely.</p>
    </div>
  );
}
