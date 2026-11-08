/* eslint-disable @next/next/no-img-element -- existing decorative payout artwork. */
export function PayoutProgress() {
  return <div role="status" className="payout-preparing">
    <span className="sr-only">Preparing your payout setup</span>
    <div aria-hidden="true" className="payout-placeholder"><span /><span /><span /></div>
  </div>;
}

export function PayoutPreparing() {
  return <div className="payout-flow">
    <header className="payout-head">
      <img src="/brand/ranks/caterpillar.svg" alt="" aria-hidden="true" width={42} height={42} />
      <h2>Set up your payouts</h2>
    </header>
    <p className="payout-lead">Verify your legal name, add your bank account, then review and accept Stripe&rsquo;s terms to receive cleanup payouts.</p>
    <PayoutProgress />
  </div>;
}
