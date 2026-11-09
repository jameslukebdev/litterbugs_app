'use client';
/* eslint-disable @next/next/no-img-element -- local screenshot previews. */
import { useState } from 'react';
import Link from 'next/link';
import { PayoutPanel } from '@/components/payout-panel';
import { captures, type Capture } from './captures';
import styles from './preview.module.css';

const steps: { id: string; title: string; label: string; note: string; capture?: Capture }[] = [
  { id: 'clean', title: 'Start from a funded cleanup', label: 'Example entry point', note: 'Clean opens payout setup if you still need it. If payouts are ready, Clean takes you straight to the safety check. You can also start from Account → Payments.' },
  { id: 'eligibility', title: 'Confirm eligibility', label: 'First-time setup', note: 'Litterbugs confirms that a cleaner is at least 18 and eligible for US payouts.' },
  { id: 'start', title: 'Start Stripe setup', label: 'Live website capture', note: 'The embedded Stripe form opens inside Litterbugs. Add information starts the Stripe steps.', capture: 'stripe-entry' },
  { id: 'phone', title: 'Verify your phone', label: 'Interactive example', note: 'Stripe opens a secure verification window. A new user enters a number. For a returning user, Stripe can send a code to the number already linked to their Stripe sign-in.' },
  { id: 'name', title: 'Enter your legal name', label: 'Earlier blank Stripe capture', note: 'Stripe asks for your legal name and can request other information based on your account. This blank capture uses the earlier Litterbugs header.', capture: 'legal-name' },
  { id: 'bank', title: 'Choose your bank', label: 'Live website capture', note: 'Connect your bank or enter your bank details manually.', capture: 'bank-selection' },
  { id: 'manual', title: 'Enter bank details manually', label: 'Optional route · live website capture', note: 'Choose Not now when Stripe offers Link sign-in. Stripe then shows the routing and account fields and its bank authorization.', capture: 'manual-bank' },
  { id: 'review', title: 'Review and submit', label: 'Stripe test-account capture', note: 'Stripe shows the details you entered and its agreement. This capture uses test data.', capture: 'final-review' },
  { id: 'ready', title: 'Payouts ready', label: 'Account → Payments', note: 'This status appears after Stripe confirms that payouts are enabled.' },
  { id: 'safety', title: 'Return to your cleanup', label: 'Test cleanup capture', note: 'With payouts enabled, the same funded cleanup opens to the safety check. Confirm safety and claim the cleanup to begin.', capture: 'cleanup-safety' },
];

export default function Preview() {
  const [step, setStep] = useState(0);
  const [eligible, setEligible] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const current = steps[step];
  const capture = current.capture ? captures[current.capture] : null;
  const captureUrl = `/local-payout-preview/capture/${current.capture}`;

  function selectStep(next: number) {
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>Local walkthrough · no details saved</span><h1>Payout setup, step by step</h1></div>
      <Link href="/account/payments">Open local payout settings →</Link>
    </header>
    <div className={styles.layout}>
      <nav className={styles.nav} aria-label="Payout setup previews">
        {steps.map((item, index) => <button key={item.id} aria-current={step === index ? 'step' : undefined} onClick={() => selectStep(index)}>
          <span>{index + 1}</span><div><strong>{item.title}</strong><small>{item.label}</small></div>
        </button>)}
      </nav>
      <section className={styles.stage} aria-labelledby="preview-title">
        <div className={styles.caption}><h2 id="preview-title">{current.title}</h2><p>{current.note}</p></div>
        {capture ? <figure className={styles.capture}>
          <img {...capture} src={captureUrl} alt={`${current.title} · ${current.label}`} />
          <a href={captureUrl} target="_blank" rel="noreferrer">View full-size capture ↗</a>
        </figure> : <div className={styles.example}>
          {current.id === 'clean' && <div className="payout-flow"><div className={styles.sampleCard}>
            <span className={styles.exampleTag}>Example cleanup</span>
            <h3>Roadside litter cleanup</h3>
            <p>Pays $10 once approved</p>
            <button className="primary-button payout-go" onClick={() => selectStep(step + 1)}>Clean</button>
          </div></div>}
          {current.id === 'eligibility' && <PayoutPanel status={{ onboardingStatus: 'not_started', payoutsEnabled: false, requirementsDue: [] }} eligibleConfirmed={eligible} onEligible={setEligible} busy={false} message="" onContinue={() => selectStep(step + 1)} />}
          {current.id === 'phone' && <div className="payout-flow"><div className={styles.sampleCard}>
            <span className={styles.exampleTag}>Example only · no text messages sent</span>
            {showCode ? <>
              <h3>Enter the 6-digit code</h3>
              <p>In the real flow, Stripe texts the code to the number being verified.</p>
              <label className={styles.phoneField}>Example verification code<input value="123456" readOnly /></label>
              <button className="primary-button payout-go" onClick={() => { setShowCode(false); selectStep(step + 1); }}>Verify example code</button>
              <button className={styles.changeNumber} onClick={() => setShowCode(false)}>Back to phone entry</button>
            </> : <>
              <h3>Enter your mobile number</h3>
              <p>Try this step with a sample number.</p>
              <label className={styles.phoneField}>Example mobile number<input value="(202) 555-0123" readOnly /></label>
              <button className="primary-button payout-go" onClick={() => setShowCode(true)}>Show example code</button>
            </>}
          </div></div>}
          {current.id === 'ready' && <fieldset disabled className={styles.disabled}><PayoutPanel status={{ onboardingStatus: 'enabled', payoutsEnabled: true, requirementsDue: [] }} eligibleConfirmed onEligible={() => undefined} busy={false} message="" onContinue={() => undefined} /></fieldset>}
        </div>}
        <footer className={styles.pager}><button disabled={step === 0} onClick={() => selectStep(step - 1)}>← Previous</button><span>{step + 1} of {steps.length}</span><button disabled={step === steps.length - 1} onClick={() => selectStep(step + 1)}>Next preview →</button></footer>
      </section>
    </div>
  </main>;
}
