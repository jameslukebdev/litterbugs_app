/* eslint-disable @next/next/no-img-element -- existing decorative payout artwork. */
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

export function PayoutHeading() {
  return <>
    <header className="payout-head">
      <img src="/brand/ranks/caterpillar.svg" alt="" aria-hidden="true" width={42} height={42} />
      <h2>Set up your payouts</h2>
    </header>
    <p className="payout-lead">Your payout details go securely to Stripe. You can connect your bank or enter details manually through its Link window.</p>
  </>;
}
