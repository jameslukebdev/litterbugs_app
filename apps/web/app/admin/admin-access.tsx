'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { AdminAccessState } from '@/lib/admin-access';
import { createClient } from '@/lib/supabase/client';

import styles from './admin.module.css';

type TotpEnrollment = { id: string; qrCode: string; secret: string };

export function AdminAccess({ state }: { state: Exclude<AdminAccessState, 'authorized'> }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state !== 'mfa_required') return;
    const supabase = createClient();
    void supabase.auth.mfa.listFactors().then(async ({ data, error }) => {
      if (error) return setMessage('Multi-factor setup could not be loaded.');
      const verified = data.totp.find((factor) => factor.status === 'verified');
      if (verified) return setFactorId(verified.id);
      for (const incomplete of data.totp) {
        await supabase.auth.mfa.unenroll({ factorId: incomplete.id });
      }
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Litterbugs admin',
      });
      if (enrollError) return setMessage('Multi-factor setup could not be started.');
      setFactorId(enrolled.id);
      setEnrollment({
        id: enrolled.id,
        qrCode: enrolled.totp.qr_code,
        secret: enrolled.totp.secret,
      });
    });
  }, [state]);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const { error } = await createClient().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (error) return setMessage('The email and password did not match.');
    router.refresh();
  }

  async function signInWithGoogle() {
    setBusy(true);
    setMessage('');
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/admin` },
    });
    if (error) {
      setBusy(false);
      setMessage('Google sign in could not be started. Check your connection and try again.');
    }
  }

  async function verifyMfa(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId || !/^\d{6}$/.test(code)) return setMessage('Enter the 6-digit code from your authenticator app.');
    setBusy(true);
    setMessage('');
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId, code });
    setBusy(false);
    if (error) return setMessage('That code was not accepted. Try the newest code.');
    router.refresh();
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.refresh();
  }

  if (state === 'not_authorized') {
    return (
      <section className={styles.accessCard}>
        <h2>Admin access required</h2>
        <p>This account is signed in but is not on the cleanup admin list.</p>
        <button className={styles.secondaryButton} onClick={signOut}>Sign out</button>
      </section>
    );
  }

  if (state === 'mfa_required') {
    return (
      <section className={styles.accessCard}>
        <h2>Verify with your authenticator</h2>
        <p>Admin reviews require a fresh AAL2 session.</p>
        {enrollment ? (
          <div className={styles.enrollment}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrollment.qrCode} alt="Authenticator enrollment QR code" />
            <p>Can’t scan it? Enter this key: <code>{enrollment.secret}</code></p>
          </div>
        ) : null}
        <form className={styles.accessForm} onSubmit={verifyMfa}>
          <label>6-digit code<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} /></label>
          {message && <p className={styles.error} role="alert">{message}</p>}
          <button className={styles.primaryButton} disabled={busy || !factorId}>{busy ? 'Verifying…' : 'Verify and open inbox'}</button>
        </form>
        <button className={styles.linkButton} onClick={signOut}>Use another account</button>
      </section>
    );
  }

  return (
    <section className={styles.accessCard}>
      <h2>Admin sign in</h2>
      <p>Use the permanent Litterbugs admin account. Multi-factor verification follows.</p>
      <button className={styles.googleButton} type="button" onClick={signInWithGoogle} disabled={busy}>
        {busy ? 'Opening Google…' : 'Continue with Google'}
      </button>
      <div className={styles.accessDivider}><span>or use email</span></div>
      <form className={styles.accessForm} onSubmit={signIn}>
        <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={busy} /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} /></label>
        {message && <p className={styles.error} role="alert">{message}</p>}
        <button className={styles.primaryButton} disabled={busy}>{busy ? 'Signing in…' : 'Sign in with email'}</button>
      </form>
    </section>
  );
}
