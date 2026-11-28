'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import { FiCheckCircle, FiCheck, FiMail } from 'react-icons/fi';
import styles from './reset-password-view.module.css';

export type ResetStage = 'checking' | 'choose' | 'expired' | 'sent' | 'done';

/**
 * Where the "Reset password" email lands. Every state has a way forward: an expired link offers a
 * new one right here instead of a disabled form.
 */
export function ResetPasswordView({
  stage, password, onPassword, email, onEmail, busy, error, onSave, onSendLink,
}: {
  stage: ResetStage;
  password: string;
  onPassword: (value: string) => void;
  email: string;
  onEmail: (value: string) => void;
  busy: boolean;
  error: string;
  onSave: () => void;
  onSendLink: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const passwordId = useId();
  const emailId = useId();
  const longEnough = password.length >= 8;
  const submit = (action: () => void) => (event: FormEvent) => { event.preventDefault(); if (!busy) action(); };

  return (
    <main className={styles.page}>
      <section className={styles.column}>
        <Link href="/" className={styles.logo} aria-label="Litterbugs home">
          <Image src="/brand/litterbugs-logo.png" width={636} height={433} alt="Litterbugs" priority />
        </Link>

        {stage === 'checking' ? <p className={styles.muted} role="status">Checking your reset link…</p> : null}

        {stage === 'choose' ? (
          <form className={styles.form} onSubmit={submit(onSave)} noValidate>
            <h1>Choose a new password</h1>
            <div className={styles.field}>
              <label htmlFor={passwordId}>New password</label>
              <div className={styles.passwordField}>
                <input id={passwordId} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={event => onPassword(event.target.value)} disabled={busy} autoFocus />
                <button type="button" className={styles.show} onClick={() => setShowPassword(visible => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}><span className="password-bee" aria-hidden="true" /></button>
              </div>
              <p className={longEnough ? styles.ruleMet : styles.rule}>{longEnough && <FiCheck aria-hidden="true" />}At least 8 characters</p>
            </div>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
            <button type="submit" className={styles.primary} disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
          </form>
        ) : null}

        {stage === 'expired' ? (
          <form className={styles.form} onSubmit={submit(onSendLink)} noValidate>
            <h1>This link has expired</h1>
            <p>Reset links work once and only for a short time. Enter your email and we’ll send you a new one.</p>
            <div className={styles.field}>
              <label htmlFor={emailId}>Email</label>
              <input id={emailId} type="email" inputMode="email" autoComplete="email" value={email} onChange={event => onEmail(event.target.value)} disabled={busy} />
            </div>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
            <button type="submit" className={styles.primary} disabled={busy}>{busy ? 'Sending…' : 'Send a new link'}</button>
            <p className={styles.switch}>Remembered it? <Link href="/sign-in">Sign in</Link></p>
          </form>
        ) : null}

        {stage === 'sent' ? (
          <div className={styles.result} role="status">
            <FiMail className={styles.mail} aria-hidden="true" />
            <h1>Check your email</h1>
            <p>If there’s an account for <strong>{email.trim()}</strong>, we sent it a new reset link.</p>
            <p className={styles.muted}>Can’t find it? Check your spam or junk folder.</p>
          </div>
        ) : null}

        {stage === 'done' ? (
          <div className={styles.result} role="status">
            <FiCheckCircle className={styles.done} aria-hidden="true" />
            <h1>Password updated</h1>
            <p>You’re signed in with your new password.</p>
            <Link className={styles.primary} href="/map">Go to the map</Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
