'use client';

import { useState } from 'react';
import Image from 'next/image';

import { ModalShell } from '@/components/modal-shell';
import { createClient } from '@/lib/supabase/client';

type EmailMode = 'login' | 'signup' | 'forgot' | 'sent';

export function AuthDialog({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<EmailMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState('');
  const [sentReason, setSentReason] = useState<'signup' | 'recovery'>('signup');

  const cleanEmail = email.trim().toLowerCase();
  const providerLabel = loading ? loading.charAt(0).toUpperCase() + loading.slice(1) : '';

  async function startProvider(provider: 'google' | 'facebook') {
    setMessage('');
    setLoading(provider);
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/` },
    });
    if (error) {
      setMessage(`We couldn’t start ${provider} sign in. Check your connection and try again.`);
      setLoading('');
    }
  }

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (!cleanEmail || !cleanEmail.includes('@')) return setMessage('Enter a valid email address.');
    if (mode === 'login' && !password) return setMessage('Enter your password.');
    if (mode === 'signup' && password.length < 8) return setMessage('Use at least 8 characters for your new password.');

    setLoading('email');
    const supabase = createClient();

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      setLoading('');
      if (error) return setMessage(error.message.toLowerCase().includes('email not confirmed')
        ? 'Please verify your email before signing in.'
        : 'That email and password did not match. Try again or reset your password.');
      onClose();
      return;
    }

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/` },
      });
      setLoading('');
      const hiddenDuplicate = Array.isArray(data.user?.identities) && data.user.identities.length === 0;
      if (error || hiddenDuplicate) return setMessage(hiddenDuplicate
        ? 'An account may already exist for this email. Try signing in or reset your password.'
        : 'We couldn’t create your account. Check your connection and try again.');
      if (data.session) return onClose();
      setSentReason('signup');
      setMode('sent');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading('');
    if (error) return setMessage('We couldn’t send a reset link. Check your connection and try again.');
    setSentReason('recovery');
    setMode('sent');
  }

  async function resendVerification() {
    setMessage('');
    setLoading('email');
    const { error } = await createClient().auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/` },
    });
    setLoading('');
    setMessage(error ? 'We couldn’t resend the email. Check your connection and try again.' : 'A fresh verification email is on its way.');
  }

  return (
    <ModalShell onClose={onClose} label="Sign in to Litterbugs" className="auth-dialog" closeDisabled={Boolean(loading)}>
      <Image className="auth-logo" src="/brand/litterbugs-logo.png" alt="Litterbugs" width={636} height={433} />
      {mode === 'sent' ? (
        <div className="auth-sent">
          <span className="success-mark" aria-hidden>✓</span>
          <h2>Check your email</h2>
          <p>{sentReason === 'signup'
            ? <>If <strong>{cleanEmail}</strong> is new, a verification link is on its way. If you’ve used this email before, sign in or reset your password.</>
            : <>If an account exists for <strong>{cleanEmail}</strong>, a password-reset link is on its way.</>}</p>
          {message && <p className={`form-message ${message.includes('fresh') ? 'success-message' : 'error-message'}`} role="status">{message}</p>}
          {sentReason === 'signup' && <button className="secondary-button" onClick={resendVerification} disabled={Boolean(loading)}>{loading ? 'Sending…' : 'Resend verification email'}</button>}
          <div className="auth-sent-links">
            <button onClick={() => { setMode('login'); setMessage(''); }}>Sign in instead</button>
            {sentReason === 'signup' && <button onClick={() => { setMode('forgot'); setMessage(''); }}>Reset password</button>}
          </div>
        </div>
      ) : (
        <>
          <div className="auth-heading">
            <span className="eyebrow">HELP KEEP YOUR COMMUNITY CLEAN</span>
            <h2>{mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome to Litterbugs'}</h2>
            <p>{mode === 'forgot' ? 'We’ll email you a secure password reset link.' : 'Sign in to report litter and manage the reports you create.'}</p>
          </div>

          {mode !== 'forgot' && <div className="provider-grid">
            <button className="provider-button google-provider" onClick={() => startProvider('google')} disabled={Boolean(loading)}>
              <span className="provider-button-content">
                <Image className="google-provider-icon" src="/brand/google-g-logo.png" alt="" width={200} height={204} aria-hidden />
                <span>{loading === 'google' ? 'Opening Google…' : 'Continue with Google'}</span>
              </span>
            </button>
            <button className="provider-button facebook-provider" onClick={() => startProvider('facebook')} disabled={Boolean(loading)}>
              <span className="provider-button-content">
                <svg className="facebook-provider-icon" viewBox="0 0 512 512" aria-hidden>
                  <path fill="currentColor" fillRule="evenodd" d="M480 257.35c0-123.7-100.3-224-224-224s-224 100.3-224 224c0 111.8 81.9 204.47 189 221.29V322.12h-56.89v-64.77H221V208c0-56.13 33.45-87.16 84.61-87.16 24.51 0 50.15 4.38 50.15 4.38v55.13H327.5c-27.81 0-36.51 17.26-36.51 35v42h62.12l-9.92 64.77H291v156.54c107.1-16.81 189-109.48 189-221.31Z" />
                </svg>
                <span>{loading === 'facebook' ? 'Opening Facebook…' : 'Continue with Facebook'}</span>
              </span>
            </button>
          </div>}

          {mode !== 'forgot' && <div className="auth-divider"><span>or use email</span></div>}

          <form className="auth-form" onSubmit={submitEmail}>
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" disabled={Boolean(loading)} /></label>
            {mode !== 'forgot' && <label>Password<span className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} disabled={Boolean(loading)} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></span></label>}
            {message && <p className="form-message error-message" role="alert">{message}</p>}
            <button className="primary-button" disabled={Boolean(loading)}>
              {loading === 'email' ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
            </button>
          </form>

          <div className="auth-switches">
            {mode === 'login' && <><button onClick={() => { setMode('forgot'); setMessage(''); }}>Forgot password?</button><span>New to Litterbugs? <button onClick={() => { setMode('signup'); setMessage(''); }}>Create an account</button></span></>}
            {mode !== 'login' && <button onClick={() => { setMode('login'); setMessage(''); }}>Back to sign in</button>}
          </div>
          {loading && loading !== 'email' && <p className="sr-only" aria-live="polite">Opening {providerLabel} sign in</p>}
        </>
      )}
    </ModalShell>
  );
}
