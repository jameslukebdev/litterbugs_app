'use client';
/* eslint-disable @next/next/no-img-element -- local screenshot previews and existing brand artwork. */
import { useState } from 'react';
import Link from 'next/link';
import { PayoutPanel } from '@/components/payout-panel';
import { PayoutHeading } from '@/components/payout-preparing';
import styles from './preview.module.css';

const steps = [
  { title: 'Eligibility', label: 'First-time setup', note: 'The Litterbugs confirmation that a cleaner is at least 18 and eligible for US payouts.' },
  { title: 'Phone verification', label: 'Phone entry, then code · example', note: 'A new cleaner enters their mobile number in Stripe’s own sign-in window before receiving a code. This illustration sends no text messages.' },
  { title: 'Legal name', label: 'Real Stripe screen', note: 'The current legal-name screen, captured locally with empty fields.' },
  { title: 'Choose your bank', label: 'Real Stripe screen', note: 'Choose a bank or use the manual-entry option. These are two ways to complete the same banking step.' },
  { title: 'Manual bank entry', label: 'Alternative · real Stripe screen', note: 'Stripe’s Link window asks for routing and account numbers, confirmation, and its required bank authorization.' },
  { title: 'Final review', label: 'Illustration · sample details', note: 'An example using made-up details. Stripe shows the exact review screen and agreement after the required fields are completed.' },
  { title: 'Payouts ready', label: 'Example success state', note: 'Shown once Stripe confirms that payouts are enabled. Finishing a form alone does not trigger this screen.' },
];
const captures: Record<number, string> = { 2: 'legal-name', 3: 'bank-selection', 4: 'manual-bank' };

export default function Preview() {
  const [step, setStep] = useState(0);
  const [eligible, setEligible] = useState(false);
  const [phoneScreen, setPhoneScreen] = useState<'number' | 'code'>('number');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const phoneDigits = phone.replace(/\D/g, '');
  const current = steps[step];
  function selectStep(next: number) { setStep(next); window.scrollTo({ top: 0, behavior: 'auto' }); }
  return <main className={styles.page}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>Local preview · no details saved</span><h1>Payout setup, step by step</h1></div>
      <Link href="/account/payments">Open local payout settings →</Link>
    </header>
    <div className={styles.layout}>
      <nav className={styles.nav} aria-label="Payout setup previews">
        {steps.map((item, index) => <button key={item.title} aria-current={step === index ? 'step' : undefined} onClick={() => selectStep(index)}>
          <span>{index + 1}</span><div><strong>{item.title}</strong><small>{item.label}</small></div>
        </button>)}
      </nav>
      <section className={styles.stage} aria-labelledby="preview-title">
        <div className={styles.caption}><h2 id="preview-title">{current.title}</h2><p>{current.note}</p></div>
        {captures[step] ? <figure className={styles.capture}>
          <img width={393} height={851} src={`/local-payout-preview/capture/${captures[step]}`} alt={`Local Stripe ${current.title.toLowerCase()} screen`} />
        </figure> : <div className={styles.example}>
          {step === 0 && <PayoutPanel status={{ onboardingStatus: 'not_started', payoutsEnabled: false, requirementsDue: [] }} eligibleConfirmed={eligible} onEligible={setEligible} busy={false} message="" onContinue={() => selectStep(1)} />}
          {step === 1 && <div className="payout-flow"><PayoutHeading /><div className={styles.sampleCard}>
            <span className={styles.exampleTag}>Illustration only · no SMS sent</span>
            {/* Flows like the real step: number, then Send code moves to the code screen; nothing is sent. */}
            {phoneScreen === 'number' ? <form onSubmit={event => { event.preventDefault(); if (phoneDigits.length >= 10) setPhoneScreen('code'); }}>
              <h3>Enter your mobile number</h3><p>Stripe texts a code to this number to confirm it&rsquo;s you.</p>
              <label className={styles.phoneField} htmlFor="preview-phone">Mobile phone number<input id="preview-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(555) 555-0123" value={phone} onChange={event => setPhone(event.target.value)} /></label>
              <button type="submit" className="primary-button payout-go" disabled={phoneDigits.length < 10}>Send code</button>
            </form> : <form onSubmit={event => { event.preventDefault(); if (code.length === 6) { setPhoneScreen('number'); setCode(''); selectStep(2); } }}>
              <h3>Enter the 6-digit code</h3>
              <p>Sent to (•••) •••-{phoneDigits.slice(-4)}. <button type="button" className={styles.changeNumber} onClick={() => { setPhoneScreen('number'); setCode(''); }}>Change number</button></p>
              <label className={styles.phoneField} htmlFor="preview-code">Verification code<input id="preview-code" className={styles.codeInput} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="••••••" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus /></label>
              <button type="submit" className="primary-button payout-go" disabled={code.length !== 6}>Verify</button>
            </form>}
          </div></div>}
          {step === 5 && <div className="payout-flow"><PayoutHeading /><div className={styles.sampleCard}>
            <span className={styles.exampleTag}>Illustration · fictional information</span><h3>Review your payout details</h3>
            <dl className={styles.summary}><div><dt>Legal name</dt><dd><span>Alex Example</span><button disabled>Edit</button></dd></div><div><dt>Payout account</dt><dd><span>Example Bank · •••• 1234</span><button disabled>Edit</button></dd></div></dl>
            <p>Review your information and Stripe’s agreement before confirming. The actual agreement and confirmation are provided by Stripe.</p>
            <button className="primary-button payout-go" disabled>Agree and submit</button>
          </div></div>}
          {step === 6 && <fieldset disabled className={styles.disabled}><PayoutPanel status={{ onboardingStatus: 'enabled', payoutsEnabled: true, requirementsDue: [] }} eligibleConfirmed onEligible={() => undefined} busy={false} message="" onContinue={() => undefined} /></fieldset>}
        </div>}
        <footer className={styles.pager}><button disabled={step === 0} onClick={() => selectStep(step - 1)}>← Previous</button><span>{step + 1} of {steps.length}</span><button disabled={step === steps.length - 1} onClick={() => selectStep(step + 1)}>Next preview →</button></footer>
      </section>
    </div>
  </main>;
}
