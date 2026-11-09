'use client';
/* eslint-disable @next/next/no-img-element -- local screenshot previews. */
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { PayoutPanel } from '@/components/payout-panel';
import { captures, type Capture } from './captures';
import styles from './preview.module.css';

const steps: { id: string; title: string; label: string; note: string; capture?: Capture }[] = [
  { id: 'clean', title: 'Start from a funded cleanup', label: 'Example entry point', note: 'Clean opens payout setup if you still need it. If payouts are ready, Clean takes you straight to the safety check. You can also start from Account → Payments.' },
  { id: 'eligibility', title: 'Confirm eligibility', label: 'First-time setup', note: 'Litterbugs confirms that a cleaner is at least 18 and eligible for US payouts.' },
  { id: 'start', title: 'Start Stripe setup', label: 'Live website capture', note: 'After Set up payouts, select Add information inside the Stripe form to start verification. Try the highlighted button below.', capture: 'stripe-entry' },
  { id: 'phone', title: 'Verify your phone', label: 'Interactive example', note: 'Stripe opens a secure verification window. A new user enters a number. For a returning user, Stripe can send a code to the number already linked to their Stripe sign-in.' },
  { id: 'name', title: 'Enter your legal name', label: 'Earlier blank Stripe capture', note: 'Stripe asks for your legal name and can request other information based on your account. This blank capture uses the earlier Litterbugs header.', capture: 'legal-name' },
  { id: 'bank', title: 'Choose your bank', label: 'Live website capture', note: 'The small Payout details dropdown above “Select an account for payouts” opens Stripe’s section menu. Try it to go back to Personal details.', capture: 'bank-selection' },
  { id: 'manual', title: 'Enter bank details manually', label: 'Optional route · live website capture', note: 'Choose Not now when Stripe offers Link sign-in. Stripe then shows the routing and account fields and its bank authorization.', capture: 'manual-bank' },
  { id: 'review', title: 'Review and submit', label: 'Stripe test-account capture', note: 'After adding bank details, Stripe shows Edit beside Personal details and Payout details. Try either button on this test-account capture.', capture: 'final-review' },
  { id: 'ready', title: 'Payouts ready', label: 'Account → Payments', note: 'This status appears after Stripe confirms that payouts are enabled.' },
  { id: 'safety', title: 'Return to your cleanup', label: 'Test cleanup capture', note: 'With payouts enabled, the same funded cleanup opens to the safety check. Confirm safety and claim the cleanup to begin.', capture: 'cleanup-safety' },
];

const captureViews: Partial<Record<Capture, { x: number; y: number; width: number; height: number }>> = {
  'stripe-entry': { x: 404, y: 30, width: 605, height: 368 },
  'final-review': { x: 404, y: 30, width: 605, height: 785 },
};

function CaptureButton({ label, bounds: [left, top, width, height], onClick, expanded }: {
  label: string;
  bounds: [number, number, number, number];
  onClick: () => void;
  expanded?: boolean;
}) {
  return <button type="button" className={styles.captureButton} aria-label={label} aria-expanded={expanded}
    style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }} onClick={onClick} />;
}

function StripeCapture({ screen, label, children }: { screen: Capture; label: string; children?: ReactNode }) {
  const image = captures[screen];
  const view = captureViews[screen] ?? { x: 0, y: 0, ...image };
  const url = `/local-payout-preview/capture/${screen}`;
  return <figure className={styles.capture}>
    <div className={styles.captureFrame} style={{ width: view.width, aspectRatio: `${view.width} / ${view.height}` }}>
      <div className={styles.captureSurface} style={{
        width: `${image.width / view.width * 100}%`,
        left: `${-view.x / view.width * 100}%`,
        top: `${-view.y / view.height * 100}%`,
      }}>
        <img {...image} src={url} alt={label} />
        {children}
      </div>
    </div>
    <a href={url} target="_blank" rel="noreferrer">View full-size capture ↗</a>
  </figure>;
}

export default function Preview({ initialStep }: { initialStep?: string }) {
  const [step, setStep] = useState(() => Math.max(0, steps.findIndex(item => item.id === initialStep)));
  const [eligible, setEligible] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [showSections, setShowSections] = useState(false);
  const [editingFromReview, setEditingFromReview] = useState(false);
  const current = steps[step];

  function selectStep(next: number, fromReview = false) {
    setStep(next);
    setShowSections(false);
    setEditingFromReview(fromReview);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function showStep(id: string, fromReview = false) {
    selectStep(steps.findIndex(item => item.id === id), fromReview);
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
        <div className={styles.caption}>
          <h2 id="preview-title">{current.title}</h2><p>{current.note}</p>
          {editingFromReview && (current.id === 'name' || current.id === 'bank') && (
            <button type="button" className={styles.returnToReview} onClick={() => showStep('review')}>← Return to review preview</button>
          )}
        </div>
        {current.capture ? <StripeCapture screen={current.capture} label={`${current.title} · ${current.label}`}>
          {current.id === 'start' && <CaptureButton label="Add information" bounds={[43.1, 40.4, 11.8, 6.7]} onClick={() => showStep('phone')} />}
          {current.id === 'bank' && <>
            <CaptureButton label="Payout details" bounds={[4.5, 22.8, 38, 5.1]} expanded={showSections} onClick={() => setShowSections(open => !open)} />
            {showSections && <div className={styles.sectionMenu}>
              <button type="button" onClick={() => showStep('name')}><span aria-hidden="true">✓</span> Personal details</button>
              <button type="button" aria-current="step" onClick={() => setShowSections(false)}><span aria-hidden="true">○</span> Payout details</button>
            </div>}
          </>}
          {current.id === 'review' && <>
            <CaptureButton label="Edit personal details" bounds={[62.65, 43.35, 5.2, 6]} onClick={() => showStep('name', true)} />
            <CaptureButton label="Edit payout details" bounds={[62.65, 62.35, 5.2, 6]} onClick={() => showStep('bank', true)} />
          </>}
        </StripeCapture> : <div className={styles.example}>
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
