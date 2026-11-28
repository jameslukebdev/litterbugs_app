'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FiCheck, FiMail } from 'react-icons/fi';
import { normalizeWeeklyEmail } from '@litterbugs/report-contract';
import styles from '@/components/email-preferences.module.css';

export function UnsubscribeForm() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const address = normalizeWeeklyEmail(email);
    if (!address) return setError('Enter a valid email address.');
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/email/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: address, website }) });
      if (!response.ok) throw new Error(response.status === 429 ? 'Too many requests. Please try again later.' : 'Your request could not be saved. Please try again.');
      setEmail(''); setDone(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Your request could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }
  return <section className={`${styles.publicCard} ${done ? styles.confirmation : ''}`} data-clarity-mask="true" data-ph-no-capture>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className={styles.brand} src="/brand/litterbugs-logo.png" alt="Litterbugs" />
    <span className={styles.icon}>{done ? <FiCheck aria-hidden /> : <FiMail aria-hidden />}</span>
    {done ? <>
      <div role="status"><h1>You’re unsubscribed</h1></div>
      <Link className={styles.secondary} href="/account/email-preferences">Email preferences</Link>
      <button className={styles.secondary} style={{ marginTop: 12 }} onClick={() => setDone(false)}>Another email address</button>
    </> : <>
      <h1>Unsubscribe from email list</h1>
      <form onSubmit={submit}>
        <label className={styles.field}>Email address<input type="email" name="email" autoComplete="email" required maxLength={254} value={email} disabled={busy} onChange={e => setEmail(e.target.value)} /></label>
        <label className={styles.honeypot} aria-hidden>Leave this empty<input name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <button className={styles.primary} type="submit" disabled={busy}>{busy ? 'Saving…' : 'Unsubscribe'}</button>
      </form>
    </>}
    <nav className={styles.publicLinks} aria-label="Email links"><Link href="/privacy">Privacy policy</Link><Link href="/account/email-preferences">Email preferences</Link></nav>
  </section>;
}
