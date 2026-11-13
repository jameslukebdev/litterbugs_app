'use client';

import { useId, useState, type ReactNode } from 'react';
import { IoCameraOutline, IoChevronDown, IoDocumentTextOutline, IoRibbonOutline, IoTimeOutline } from 'react-icons/io5';
import { BrandBug } from './brand-bug';
import styles from './cleanup-start-panel.module.css';

const SITE_CONFIRMATION = 'I can legally access this site and clean safely with my equipment, away from moving traffic and hazardous materials. I will stop if conditions become unsafe.';
const ACCEPTANCE = 'I confirm I am 18 or older. I have read and accept this version of the safety guidelines, funded reward acknowledgment, assumption of risk, and release.';

type Props = {
  reportTitle?: string | null; rewardCents: number; agreementSaved: boolean;
  waiver: { body: string; guidelines_body?: string | null; release_body?: string | null; published_at: string };
  waiverAccepted: boolean; onWaiverAccepted: (value: boolean) => void;
  siteConfirmed: boolean; onSiteConfirmed: (value: boolean) => void;
  busy: boolean; disabled: boolean; onClaim: () => void; notice?: ReactNode;
};

/** Same first-use agreement and per-site confirmation as the native cleanup start. */
export function CleanupSafetyPanel({ rewardCents, agreementSaved, waiver, waiverAccepted, onWaiverAccepted, siteConfirmed, onSiteConfirmed, busy, disabled, onClaim, notice }: Props) {
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const id = useId();
  const checked = agreementSaved ? siteConfirmed : waiverAccepted && siteConfirmed;
  const ready = checked && (agreementSaved || opened);
  const locked = !agreementSaved && !opened;
  const updated = Number.isFinite(Date.parse(waiver.published_at))
    ? new Date(waiver.published_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : null;
  const reward = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(rewardCents / 100);

  return <div className={styles.panel} data-cleanup-start>
    <div className={styles.scroll}>
      {notice}
      <header className={styles.hero}>
        <BrandBug kind="butterfly" size={56} />
        <h2>Let’s clean this spot</h2>
      </header>
      <ul className={styles.steps}>
        <li><span className={`${styles.stepIcon} ${styles.time}`}><IoTimeOutline aria-hidden="true" /></span><strong>Clean it within 24 hours</strong></li>
        <li><span className={`${styles.stepIcon} ${styles.photo}`}><IoCameraOutline aria-hidden="true" /></span><strong>Snap an after photo from the same spot</strong></li>
        <li><span className={`${styles.stepIcon} ${rewardCents > 0 ? styles.fund : styles.points}`}>
          {rewardCents > 0 ? <BrandBug kind="bee" size={22} /> : <IoRibbonOutline aria-hidden="true" />}
        </span><strong className={rewardCents > 0 ? styles.pay : undefined}>{rewardCents > 0 ? `Get paid ${reward} once approved` : 'Earn 3 points once approved'}</strong></li>
      </ul>
      <div className={styles.confirmation}>
        <label className={styles.check}>
          <input type="checkbox" checked={checked} disabled={disabled || busy || locked}
            aria-describedby={locked ? `${id}-hint` : undefined}
            onChange={event => { if (!agreementSaved) onWaiverAccepted(event.target.checked); onSiteConfirmed(event.target.checked); }} />
          <span>{!agreementSaved && <>{ACCEPTANCE} </>}{SITE_CONFIRMATION}</span>
        </label>
        {!agreementSaved && <>
          <span className="sr-only" id={`${id}-hint`}>Read the cleanup agreement first to enable this checkbox.</span>
          <button type="button" className={styles.read} aria-expanded={open} aria-controls={`${id}-agreement`} disabled={busy}
            onClick={() => { setOpen(current => !current); setOpened(true); }}>
            <IoDocumentTextOutline aria-hidden="true" /><span>Read the cleanup agreement</span><IoChevronDown className={styles.chevron} aria-hidden="true" />
          </button>
          {open && <section id={`${id}-agreement`} className={styles.agreement} aria-label="Cleanup agreement">
            {updated && <p className={styles.updated}>Updated {updated}</p>}
            {waiver.guidelines_body && <><h3>Stay safe</h3><p>{waiver.guidelines_body.trim()}</p></>}
            <p><strong>Only continue if the location is safe to clean.</strong></p>
            <h3>Cleanup agreement</h3><p>{waiver.body.trim()}</p>
            {waiver.release_body && <><h3>Assumption of risk and release</h3><p>{waiver.release_body.trim()}</p></>}
          </section>}
        </>}
      </div>
    </div>
    <footer className={styles.footer}>
      <button type="button" className={styles.start} aria-busy={busy || undefined} disabled={disabled || busy || !ready} onClick={onClaim}>
        <BrandBug kind="butterfly" size={22} />Start my cleanup
      </button>
    </footer>
  </div>;
}
