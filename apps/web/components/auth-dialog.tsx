'use client';
import Link from 'next/link';

import { useEffect, useState } from 'react';
import Image from 'next/image';

import { ModalShell } from '@/components/modal-shell';
import { BrandBug } from '@/components/brand-bug';
import brandStyles from '@/components/public-website/brand.module.css';
import { googleBrowserHandoff, isEmbeddedSocialBrowser } from '@/lib/google-browser-handoff';
import { trackParticipation } from '@/lib/website-analytics';
import { createClient } from '@/lib/supabase/client';

export type AuthIntent = 'clean' | 'fund' | 'report' | null;

type EmailMode = 'login' | 'signup' | 'forgot' | 'sent';

function signupHeading(intent: AuthIntent) {
  if (intent === 'report') return 'Create a free account to report litter';
  if (intent === 'fund') return 'Create a free account to fund a cleanup';
  if (intent === 'clean') return 'Create a free account to clean up';
  return 'Create your account';
}

const participationBenefits = {
  clean: 'Make your neighborhood cleaner and earn money along the way.',
  fund: 'Put your dollars to work cleaning up this spot.',
  report: 'Put litter on the map and get a cleanup started.',
};

/** New visitors usually start a report without an account, so lead with sign-up there. */
export function authEntryMode(intent: AuthIntent): 'login' | 'signup' {
  return intent === 'report' ? 'signup' : 'login';
}

type AuthDialogProps = {
  onClose: () => void;
  onSuccess?: () => void;
  returnPath?: string;
  embedded?: boolean;
  intent?: AuthIntent;
  facebookLoginEnabled?: boolean;
  initialMode?: 'login' | 'signup';
  initialMessage?: string;
};

export function AuthDialog({
  onClose,
  onSuccess = onClose,
  returnPath,
  embedded = false,
  intent = null,
  initialMode = 'login',
  initialMessage = '',
  facebookLoginEnabled = true,
}: AuthDialogProps) {
  const [mode, setMode] = useState<EmailMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [loading, setLoading] = useState('');
  const [sentReason, setSentReason] = useState<'signup' | 'recovery'>('signup');

  useEffect(() => {
    if (loading !== 'google' && loading !== 'facebook') return;
    const recover = () => {
      setLoading('');
      setMessage('Sign in hasn’t opened. Try again, use your email, or open this page in Safari or Chrome.');
    };
    const timer = window.setTimeout(recover, 15000);
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) recover();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [loading]);

  const cleanEmail = email.trim().toLowerCase();
  const providerLabel = loading ? loading.charAt(0).toUpperCase() + loading.slice(1) : '';

  function authCallbackUrl() {
    const nextPath = returnPath ?? `${window.location.pathname}${window.location.search}${window.location.hash}`;
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  }

  useEffect(() => {
    if (intent) trackParticipation(intent, 'auth_shown');
  }, [intent]);

  function closeAuth() {
    if (intent) trackParticipation(intent, 'auth_closed');
    onClose();
  }

  async function startProvider(provider: 'google' | 'facebook') {
    if (intent) trackParticipation(intent, 'auth_submitted');
    if (provider === 'google' && isEmbeddedSocialBrowser(navigator.userAgent)) {
      const next = returnPath ?? `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const handoff = googleBrowserHandoff(window.location.origin, next, navigator.userAgent);
      setMessage('If your browser doesn’t open, use the app’s menu to open this page in Safari or Chrome, then continue with Google. You can also use your email here.');
      // Keep this synchronous with the tap so the phone can open its browser.
      // Do not create a Supabase client or PKCE verifier before handing off.
      if (handoff) {
        try { window.location.assign(handoff); } catch { /* Email and manual fallback remain available. */ }
      }
      return;
    }
    setMessage('');
    setLoading(provider);
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: authCallbackUrl() },
      });
      if (error) throw error;
    } catch {
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

    if (intent && (mode === 'login' || mode === 'signup')) trackParticipation(intent, 'auth_submitted');
    setLoading('email');
    const supabase = createClient();

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        setLoading('');
        if (error) return setMessage(error.message.toLowerCase().includes('email not confirmed')
          ? 'Please verify your email before signing in.'
          : 'That email and password did not match. Try again or reset your password.');
        onSuccess();
        return;
      }

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: authCallbackUrl() },
        });
        setLoading('');
        const hiddenDuplicate = Array.isArray(data.user?.identities) && data.user.identities.length === 0;
        if (error || hiddenDuplicate) return setMessage(hiddenDuplicate
          ? 'An account may already exist for this email. Try signing in or reset your password.'
          : 'We couldn’t create your account. Check your connection and try again.');
        if (data.session) return onSuccess();
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
    } catch {
      setMessage('We couldn’t connect. Check your connection and try again.');
    } finally {
      setLoading('');
    }
  }

  async function resendVerification() {
    setMessage('');
    setLoading('email');
    try {
      const { error } = await createClient().auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: { emailRedirectTo: authCallbackUrl() },
      });
      setMessage(error ? 'We couldn’t resend the email. Check your connection and try again.' : 'A fresh verification email is on its way.');
    } catch {
      setMessage('We couldn’t connect. Check your connection and try again.');
    } finally {
      setLoading('');
    }
  }

  return (
    <ModalShell embedded={embedded} onClose={closeAuth} label={mode === 'signup' ? 'Create your Litterbugs account' : 'Sign in to Litterbugs'} className={`auth-dialog auth-dialog-simple ${brandStyles.brand}`} closeDisabled={Boolean(loading)}>
      {mode === 'sent' ? (
        <div className="auth-sent">
          <span className="success-mark success-mark-bug" aria-hidden><BrandBug kind="bee" size={40} /></span>
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
            <h2>{mode === 'signup' ? signupHeading(intent) : mode === 'forgot' ? 'Reset your password' : intent === 'clean' ? 'Sign in to clean up' : intent === 'fund' ? 'Sign in to fund a cleanup' : intent === 'report' ? 'Sign in to report litter' : 'Sign in to Litterbugs'}</h2>
            {mode === 'forgot' && <p>We’ll email you a secure password reset link.</p>}
            {mode !== 'forgot' && intent && <p>{participationBenefits[intent]}</p>}
          </div>

          <form className="auth-form" onSubmit={submitEmail}>
            <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={Boolean(loading)} /></label>
            {mode !== 'forgot' && <label>Password<span className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} disabled={Boolean(loading)} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}><span className="password-bee" aria-hidden="true" /></button></span></label>}
            {message && <p className="form-message error-message" role="alert">{message}</p>}
          {mode === 'login' && <div className="auth-forgot"><button type="button" disabled={Boolean(loading)} onClick={() => { setMode('forgot'); setMessage(''); }}>Forgot password?</button></div>}
            <button className="primary-button" disabled={Boolean(loading)}>
              {loading === 'email' ? 'Please wait…' : mode === 'signup' ? 'Continue' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
            </button>
          </form>
          {mode !== 'forgot' && <div className="auth-provider-divider" aria-hidden><span />or<span /></div>}
          {mode !== 'forgot' && <div className="provider-grid">
            <button className="provider-button google-provider" onClick={() => startProvider('google')} disabled={Boolean(loading)}>
              <span className="provider-button-content">
                <Image className="google-provider-icon" src="/brand/google-g-logo.png" alt="" width={200} height={204} aria-hidden />
                <span>{loading === 'google' ? 'Signing in with Google…' : 'Continue with Google'}</span>
              </span>
            </button>
            {facebookLoginEnabled && <button className="provider-button facebook-provider" onClick={() => startProvider('facebook')} disabled={Boolean(loading)}>
              <span className="provider-button-content">
                <svg className="facebook-provider-icon" viewBox="0 0 512 512" aria-hidden>
                  <path fill="currentColor" fillRule="evenodd" d="M480 257.35c0-123.7-100.3-224-224-224s-224 100.3-224 224c0 111.8 81.9 204.47 189 221.29V322.12h-56.89v-64.77H221V208c0-56.13 33.45-87.16 84.61-87.16 24.51 0 50.15 4.38 50.15 4.38v55.13H327.5c-27.81 0-36.51 17.26-36.51 35v42h62.12l-9.92 64.77H291v156.54c107.1-16.81 189-109.48 189-221.31Z" />
                </svg>
                <span>{loading === 'facebook' ? 'Signing in with Facebook…' : 'Continue with Facebook'}</span>
              </span>
            </button>}
          </div>}
          <div className="auth-switches">
            {mode === 'signup' ? <span>Already have an account? <button disabled={Boolean(loading)} onClick={() => { setMode('login'); setMessage(''); }}>Sign in</button></span>
              : mode === 'login' ? <span>New to Litterbugs? <button disabled={Boolean(loading)} onClick={() => { setMode('signup'); setMessage(''); }}>Create account</button></span>
              : <button disabled={Boolean(loading)} onClick={() => { setMode('login'); setMessage(''); }}>Back to sign in</button>}
          </div>
          <p className="auth-policy">By continuing, you agree to our <Link href="/terms">Terms of use</Link> and <Link href="/privacy">Privacy policy</Link>.</p>
          {loading && loading !== 'email' && <p className="sr-only" aria-live="polite">Opening {providerLabel} sign in</p>}
        </>
      )}
    </ModalShell>
  );
}
