/* eslint-disable @next/next/no-img-element -- existing decorative payout artwork. */
import { FiChevronLeft } from 'react-icons/fi';
import { PayoutTrust } from '@/components/payout-trust';
import payoutStyles from '@/components/payout-trust.module.css';
export function PayoutProgress() {
  return <div role="status" className="payout-preparing">
    <span className="sr-only">Preparing your payout setup</span>
    <div aria-hidden="true" className="payout-placeholder"><span /><span /><span /></div>
  </div>;
}

export function PayoutPreparing() {
  return <div className="payout-flow">
    <PayoutHeading />
    <div className="payout-connect-stage"><PayoutProgress /></div>
  </div>;
}

/** `onBack` adds a Back button that returns to the payout steps (shown while Stripe's form is open). */
export function PayoutHeading({ onBack }: { onBack?: () => void } = {}) {
  return <>
    <header className={`payout-head ${payoutStyles.head}`}>
      {onBack && <button type="button" className={payoutStyles.back} onClick={onBack}><FiChevronLeft aria-hidden="true" />Back</button>}
      <img src="/brand/ranks/caterpillar.svg" alt="" aria-hidden="true" width={42} height={42} />
      <h2>Set up your payouts</h2>
    </header>
    <PayoutTrust compact />
  </>;
}
