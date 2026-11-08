/* eslint-disable @next/next/no-img-element -- tiny decorative brand marks, like BrandBug. */
import type { ReactNode } from 'react';
import { Icon } from '@/components/icon';
import { formatUsd } from '@/lib/funding';

/** Funding a cleanup is the bee family: honey yellow, with the site's purple for the main action. */
function FundHead({ title, reportTitle }: { title: string; reportTitle?: string | null }) {
  return (
    <header className="fund-head">
      <img src="/brand/bugs/bee.png" alt="" aria-hidden="true" width={40} height={40} />
      <div><h2>{title}</h2>{reportTitle && <p>{reportTitle}</p>}</div>
    </header>
  );
}

function Breakdown({ principalCents, feeCents }: { principalCents: number; feeCents: number }) {
  return (
    <dl className="fund-breakdown">
      <div><dt>Goes to the cleaner</dt><dd>{formatUsd(principalCents)}</dd></div>
      <div><dt>Service fee</dt><dd>{formatUsd(feeCents)}</dd></div>
      <div className="fund-total"><dt>Total</dt><dd>{formatUsd(principalCents + feeCents)}</dd></div>
    </dl>
  );
}

/** Step 1: choose how much goes into the cleanup fund, see the fee, continue to payment. */
export function FundingAmountPanel({
  reportTitle, presets, amount, onAmount, principalCents, feeCents, quoteStatus, quoteError, onRetryQuote,
  message, busy, onContinue,
}: {
  reportTitle?: string | null; presets: string[]; amount: string; onAmount: (value: string) => void;
  principalCents: number | null; feeCents: number | null; quoteStatus: string | null; quoteError: string;
  onRetryQuote: () => void; message: string; busy: boolean; onContinue: () => void;
}) {
  return (
    <div className="fund-flow">
      <FundHead title="Add to the cleanup fund" reportTitle={reportTitle} />
      <p className="fund-lead">Whoever cleans this spot earns this money once the cleanup is approved.</p>
      <section className="fund-step">
        <h3>How much?</h3>
        <div className="fund-presets" aria-label="Suggested contribution amounts">
          {presets.map(preset => (
            <button key={preset} type="button" className="fund-preset" aria-pressed={principalCents === Number(preset) * 100} onClick={() => onAmount(preset)}>${preset}</button>
          ))}
        </div>
        <label className="fund-amount">
          <span>Or enter an amount</span>
          <span className="fund-amount-input"><b aria-hidden="true">$</b><input value={amount} onChange={event => onAmount(event.target.value)} inputMode="decimal" aria-label="Cleanup fund contribution amount" /></span>
          <small>Minimum $1, maximum $1,000</small>
        </label>
      </section>
      {principalCents != null && feeCents != null && <Breakdown principalCents={principalCents} feeCents={feeCents} />}
      {quoteStatus && <p className="fund-status" role="status">{quoteStatus}</p>}
      {quoteError && <button type="button" className="secondary-button" onClick={onRetryQuote}>Retry pricing</button>}
      <p className="fund-refund"><Icon name="info" />If this report closes before payout, your full charge—including the fee—is refunded.</p>
      {message && <p className="form-message error-message" role="alert">{message}</p>}
      <button type="button" className="primary-button fund-continue" onClick={onContinue} disabled={principalCents == null || busy || feeCents == null}>{busy ? 'Opening payment…' : 'Continue'}</button>
    </div>
  );
}

/** Step 2: the secure card form (Stripe) under a short summary. */
export function FundingPayLayout({ reportTitle, principalCents, feeCents, children, error, button }: {
  reportTitle?: string | null; principalCents: number; feeCents: number; children: ReactNode; error?: string; button: ReactNode;
}) {
  return (
    <div className="fund-flow">
      <FundHead title="Pay securely" reportTitle={reportTitle} />
      <Breakdown principalCents={principalCents} feeCents={feeCents} />
      <div className="fund-card">{children}</div>
      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {button}
      <p className="fund-stripe-note">Payments are processed securely by Stripe. Litterbugs never sees your card number.</p>
    </div>
  );
}

/** Funding isn't open for this report yet (or right now): say so plainly, with what to do next. */
export function FundingUnavailablePanel({ reportTitle, children }: { reportTitle?: string | null; children: ReactNode }) {
  return (
    <div className="fund-flow">
      <FundHead title="Add to the cleanup fund" reportTitle={reportTitle} />
      <div className="fund-unavailable">{children}</div>
    </div>
  );
}
