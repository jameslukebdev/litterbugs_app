'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const exchangeRecoveryCode = async () => {
      const code = new URL(window.location.href).searchParams.get('code');
      if (code) {
        const { error } = await createClient().auth.exchangeCodeForSession(code);
        if (error) setMessage('This reset link is invalid or has expired.');
        window.history.replaceState({}, '', '/auth/reset-password');
      }
      const { data } = await createClient().auth.getSession();
      setHasSession(Boolean(data.session));
      if (!data.session) setMessage((current) => current || 'Request a new password reset link to continue.');
      setReady(true);
    };
    void exchangeRecoveryCode();
  }, []);

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (password.length < 8) return setMessage('Use at least 8 characters for your new password.');
    if (password !== confirmPassword) return setMessage('The passwords do not match.');

    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) return setMessage('We couldn’t update your password. Request a new link and try again.');
    setComplete(true);
  }

  return (
    <main className="standalone-page">
      <section className="standalone-card">
        <Image src="/brand/litterbugs-logo.png" width={636} height={433} className="standalone-logo" alt="Litterbugs" priority />
        {complete ? (
          <>
            <h1>Password updated</h1>
            <p>Your new password is ready to use.</p>
            <Link className="primary-button button-link" href="/">Return to the map</Link>
          </>
        ) : (
          <form onSubmit={updatePassword}>
            <h1>Choose a new password</h1>
            <p>Enter a new password for your Litterbugs account.</p>
            <label>New password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={!ready || loading} /></label>
            <label>Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={!ready || loading} /></label>
            {message && <p className="form-message error-message" role="alert">{message}</p>}
            <button className="primary-button" disabled={!ready || !hasSession || loading}>{loading ? 'Saving…' : 'Save password'}</button>
          </form>
        )}
      </section>
    </main>
  );
}
