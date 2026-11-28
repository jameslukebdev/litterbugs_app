'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { FaHeart } from 'react-icons/fa6';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js/pure';
import { formatUsd } from '@/lib/funding';
import { createClient } from '@/lib/supabase/client';
import { parseTipAmount, startCleanerTip, tipFeeCents, type TipStart } from '@/lib/tips';
import styles from '../tip.module.css';

const presets = [5, 10, 20];
const stripeAppearance = {
  variables: { colorPrimary: '#5146ed', colorText: '#292932', colorDanger: '#a02935', borderRadius: '14px', fontFamily: 'system-ui, sans-serif' },
};

type Done = { tipCents: number; email: string };

export function TipForm({ cleanerId, name, backHref, backLabel = 'Back to the leaderboard' }: {
  cleanerId: string; name: string; backHref: string; backLabel?: string;
}) {
  const amountId = useId();
  const emailId = useId();
  const [dollars, setDollars] = useState('5');
  const [email, setEmail] = useState('');
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [start, setStart] = useState<TipStart | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const requestId = useRef<string | null>(null);
  const cents = parseTipAmount(dollars);
  const fee = cents == null ? null : tipFeeCents(cents);
  const total = cents == null || fee == null ? null : cents + fee;
  const invalid = dollars.trim() !== '' && cents == null;
  const receiptEmail = accountEmail ?? email.trim();

  useEffect(() => {
    // Signed-in members get the receipt at their account email; guests type one.
    void createClient().auth.getUser().then(({ data }) => {
      if (data.user && !data.user.is_anonymous && data.user.email) setAccountEmail(data.user.email);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    // Back from a bank check (e.g. 3-D Secure): confirm the payment's result with Stripe.
    const params = new URLSearchParams(window.location.search);
    const secret = params.get('payment_intent_client_secret');
    const key = params.get('pk');
    if (!secret || !key || !/^pk_(live|test)_/.test(key)) return;
    const keep = new URLSearchParams();
    for (const name of ['role', 'back', 'town']) { const value = params.get(name); if (value) keep.set(name, value); }
    window.history.replaceState(window.history.state, '', window.location.pathname + (keep.size ? `?${keep}` : ''));
    void loadStripe(key).then(stripe => stripe?.retrievePaymentIntent(secret)).then(result => {
      const intent = result?.paymentIntent;
      if (intent && (intent.status === 'succeeded' || intent.status === 'processing')) {
        setDone({ tipCents: Number(params.get('tip')) || intent.amount, email: intent.receipt_email ?? '' });
      } else {
        setMessage('Your tip didn’t go through. No payment was taken. Please try again.');
      }
    }).catch(() => setMessage('We couldn’t confirm your tip. Check your email for a receipt before trying again.'));
  }, []);

  const stripe = useMemo(() => start ? loadStripe(start.publishableKey) : null, [start]);

  async function continueToPay(event: FormEvent) {
    event.preventDefault();
    if (busy || cents == null) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(receiptEmail)) { setMessage('Enter an email for your receipt.'); return; }
    setBusy(true);
    setMessage('');
    requestId.current ??= crypto.randomUUID();
    try {
      setStart(await startCleanerTip({ cleanerId, tipAmountCents: cents, clientRequestId: requestId.current,
        ...(accountEmail ? {} : { receiptEmail }) }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We couldn’t start your tip. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function changeAmount() {
    setStart(null);
    setMessage('');
    requestId.current = null;
  }

  if (done) {
    return <div className={styles.done} role="status">
      <FaHeart aria-hidden="true" />
      <h2>Thanks for tipping {name}!</h2>
      <p>{name} gets {formatUsd(done.tipCents)}.{done.email ? ` Your receipt is on its way to ${done.email}.` : ''}</p>
      <Link className="secondary-button" href={backHref}>{backLabel}</Link>
    </div>;
  }

  if (start && stripe) {
    return <div className={styles.pay}>
      <div className={styles.payHead}>
        <span>{name} gets {formatUsd(start.tipAmountCents)}</span>
        <button type="button" className={styles.change} onClick={changeAmount}>Change amount</button>
      </div>
      <Elements stripe={stripe} options={{ clientSecret: start.clientSecret, appearance: stripeAppearance }}>
        <PayStep start={start} receiptEmail={receiptEmail}
          onPaid={() => setDone({ tipCents: start.tipAmountCents, email: receiptEmail })} />
      </Elements>
    </div>;
  }

  return (
    <form className="fund-flow" onSubmit={continueToPay} noValidate>
      <fieldset className={styles.amount}>
        <legend className="sr-only">Tip amount</legend>
        <div className="fund-presets">
          {presets.map(amount => (
            <button key={amount} type="button" className="fund-preset" aria-pressed={cents === amount * 100}
              onClick={() => { setDollars(String(amount)); setMessage(''); }}>${amount}</button>
          ))}
        </div>
        <div className="fund-amount">
          <label htmlFor={amountId}>Other amount</label>
          <span className="fund-amount-input">
            <b aria-hidden="true">$</b>
            <input id={amountId} value={dollars} inputMode="decimal" autoComplete="off"
              aria-invalid={invalid || undefined} aria-describedby={invalid ? `${amountId}-error` : undefined}
              onChange={event => { setDollars(event.currentTarget.value); setMessage(''); }} />
          </span>
          {invalid && <small id={`${amountId}-error`} className={styles.inputError} role="alert">Enter $3 to $1,000.</small>}
        </div>
      </fieldset>
      {!accountEmail && <div className={styles.email}>
        <label htmlFor={emailId}>Email for your receipt</label>
        <input id={emailId} type="email" autoComplete="email" value={email} onChange={event => { setEmail(event.currentTarget.value); setMessage(''); }} />
      </div>}
      <dl className={styles.breakdown} aria-live="polite" aria-atomic="true">
        <div className={styles.gets}><dt>{name} gets</dt><dd>{cents == null ? '—' : formatUsd(cents)}</dd></div>
        <div><dt>Litterbugs service fee</dt><dd>{fee == null ? '—' : formatUsd(fee)}</dd></div>
        <div className={styles.total}><dt>You pay</dt><dd>{total == null ? '—' : formatUsd(total)}</dd></div>
      </dl>
      {message && <p className={styles.error} role="alert">{message}</p>}
      <button className={`primary-button fund-continue ${styles.continue}`} type="submit" disabled={busy || total == null}>
        {busy ? 'Starting…' : total == null ? 'Continue to pay' : `Continue to pay ${formatUsd(total)}`}
      </button>
      <a className={styles.stripeBadge} href="https://stripe.com" target="_blank" rel="noopener noreferrer">
        <Image src="/brand/powered-by-stripe.svg" alt="Powered by Stripe" width={120} height={27} unoptimized />
      </a>
    </form>
  );
}

function PayStep({ start, receiptEmail, onPaid }: {
  start: TipStart; receiptEmail: string; onPaid: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function pay(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true);
    setMessage('');
    const returnUrl = new URL(window.location.href);
    returnUrl.hash = '';
    returnUrl.searchParams.set('pk', start.publishableKey);
    returnUrl.searchParams.set('tip', String(start.tipAmountCents));
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl.toString(), receipt_email: receiptEmail },
      redirect: 'if_required',
    });
    if (result.error) {
      setMessage(result.error.message ?? 'Your payment didn’t go through. Please try again.');
      setBusy(false);
      return;
    }
    if (result.paymentIntent?.status === 'succeeded' || result.paymentIntent?.status === 'processing') onPaid();
    else { setMessage('Your payment didn’t go through. Please try again.'); setBusy(false); }
  }

  return <form className={styles.pay} onSubmit={pay}>
    <PaymentElement options={{ layout: 'tabs' }} />
    {message && <p className={styles.error} role="alert">{message}</p>}
    <button className={`primary-button fund-continue ${styles.continue}`} type="submit" disabled={!stripe || busy}>
      {busy ? 'Paying…' : `Pay ${formatUsd(start.totalAmountCents)}`}
    </button>
  </form>;
}
