'use client';
/* eslint-disable @next/next/no-img-element -- small bug icons that label each action, like BrandBug. */
import Link from 'next/link';

import { useEffect, useId, useState } from 'react';
import Image from 'next/image';

import { ModalShell } from '@/components/modal-shell';
import { FiCheck, FiMail } from 'react-icons/fi';
import brandStyles from '@/components/public-website/brand.module.css';
import styles from '@/components/auth-dialog.module.css';
import { googleBrowserHandoff, isEmbeddedSocialBrowser } from '@/lib/google-browser-handoff';
import { trackParticipation, trackParticipationFailure } from '@/lib/website-analytics';
import { createClient } from '@/lib/supabase/client';

export type AuthIntent = 'clean' | 'fund' | 'report' | null;

type EmailMode = 'login' | 'signup' | 'forgot' | 'sent';

function signupHeading(intent: AuthIntent) {
  if (intent === 'report') return 'Create a free account to report litter';
  if (intent === 'fund') return 'Create a free account to fund a cleanup';
  if (intent === 'clean') return 'Create a free account to clean up';
  return 'Create your account';
}

/** Same bug as the homepage's action for each: dragonfly = report, bee = fund, caterpillar = clean. */
const participationBugs = {
  clean: '/brand/ranks/caterpillar.svg',
  fund: '/brand/bugs/bee.png',
  report: '/brand/ranks/dragonfly.svg',
};

const participationBenefits = {
  clean: 'Make your neighborhood cleaner and earn money along the way.',
  fund: 'Put your dollars to work cleaning up this spot.',
  report: 'Put litter on the map and earn cash from funded cleanups.',
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
  const emailId = useId();
  const passwordId = useId();

  useEffect(() => {
    if (loading !== 'google' && loading !== 'facebook') return;
    let recovered = false;
    const recover = () => {
      if (recovered) return;
      recovered = true;
      if (intent) trackParticipationFailure(intent, 'auth_submitted', 'auth_redirect_stalled');
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
  }, [loading, intent]);

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
      if (intent) trackParticipationFailure(intent, 'auth_submitted', 'auth_start_failed');
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
    try {
      const supabase = createClient();
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        setLoading('');
        if (error) {
          if (intent) trackParticipationFailure(intent, 'auth_submitted', 'auth_rejected');
          return setMessage(error.message.toLowerCase().includes('email not confirmed')
          ? 'Please verify your email before signing in.'
          : 'That email and password did not match. Try again or reset your password.');
        }
        if (intent) trackParticipation(intent, 'auth_succeeded');
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
        if (error || hiddenDuplicate) {
          if (intent) trackParticipationFailure(intent, 'auth_submitted', 'auth_rejected');
          return setMessage(hiddenDuplicate
          ? 'An account may already exist for this email. Try signing in or reset your password.'
          : 'We couldn’t create your account. Check your connection and try again.');
        }
        if (data.session) {
          if (intent) trackParticipation(intent, 'auth_succeeded');
          return onSuccess();
        }
        if (intent) trackParticipation(intent, 'verification_sent');
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
      if (intent && (mode === 'login' || mode === 'signup')) trackParticipationFailure(intent, 'auth_submitted', 'auth_network_failed');
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

  const busy = Boolean(loading);
  const passwordLongEnough = password.length >= 8;
  const switchMode = (next: EmailMode) => { setMode(next); setMessage(''); };
  const heading = mode === 'signup' ? signupHeading(intent)
    : mode === 'forgot' ? 'Reset your password'
    : intent === 'clean' ? 'Sign in to clean up' : intent === 'fund' ? 'Sign in to fund a cleanup' : intent === 'report' ? 'Sign in to report litter' : 'Sign in to Litterbugs';

  return (
    <ModalShell embedded={embedded} onClose={closeAuth} label={mode === 'signup' ? 'Create your Litterbugs account' : 'Sign in to Litterbugs'} className={`auth-dialog auth-dialog-simple ${styles.dialog} ${brandStyles.brand}`} closeDisabled={busy}>
      {mode === 'sent' ? (
        <div className={styles.sent}>
          <FiMail className={styles.sentIcon} aria-hidden="true" />
          <h2>Check your email</h2>
          <p>{sentReason === 'signup'
            ? <>If <strong>{cleanEmail}</strong> is new to Litterbugs, we sent it a link to finish signing up.</>
            : <>If there’s an account for <strong>{cleanEmail}</strong>, we sent it a link to reset your password.</>}</p>
          <p className={styles.muted}>Can’t find it? Check your spam or junk folder.</p>
          {message && <p className={message.includes('fresh') ? styles.success : styles.error} role="status">{message}</p>}
          {sentReason === 'signup' && <button type="button" className={styles.secondary} onClick={resendVerification} disabled={busy}>{loading ? 'Sending…' : 'Send it again'}</button>}
          <div className={styles.sentLinks}>
            <button type="button" className={styles.textButton} onClick={() => switchMode('login')}>Sign in instead</button>
            {sentReason === 'signup' && <button type="button" className={styles.textButton} onClick={() => switchMode('forgot')}>Reset password</button>}
          </div>
        </div>
      ) : (
        <>
          <div className={`auth-heading ${styles.heading}`}>
            <h2>{heading}</h2>
            {mode === 'forgot' && <p>We’ll email you a link to choose a new password.</p>}
            {mode !== 'forgot' && intent && <p className={styles.benefit}><img src={participationBugs[intent]} alt="" aria-hidden="true" width={22} height={22} />{participationBenefits[intent]}</p>}
          </div>

          {mode !== 'forgot' && <div className={styles.providers}>
            <button type="button" className={styles.provider} onClick={() => startProvider('google')} disabled={busy}>
              <Image src="/brand/google-g-logo.png" alt="" width={200} height={204} aria-hidden />
              <span>{loading === 'google' ? 'Signing in with Google…' : 'Continue with Google'}</span>
            </button>
            {facebookLoginEnabled && <button type="button" className={styles.provider} onClick={() => startProvider('facebook')} disabled={busy}>
              <svg className={styles.facebookIcon} viewBox="0 0 512 512" aria-hidden>
                <path fill="currentColor" fillRule="evenodd" d="M480 257.35c0-123.7-100.3-224-224-224s-224 100.3-224 224c0 111.8 81.9 204.47 189 221.29V322.12h-56.89v-64.77H221V208c0-56.13 33.45-87.16 84.61-87.16 24.51 0 50.15 4.38 50.15 4.38v55.13H327.5c-27.81 0-36.51 17.26-36.51 35v42h62.12l-9.92 64.77H291v156.54c107.1-16.81 189-109.48 189-221.31Z" />
              </svg>
              <span>{loading === 'facebook' ? 'Signing in with Facebook…' : 'Continue with Facebook'}</span>
            </button>}
          </div>}
          {mode !== 'forgot' && <div className={styles.divider} aria-hidden><span />or use your email<span /></div>}

          <form className={styles.form} onSubmit={submitEmail} noValidate>
            <div className={styles.field}>
              <label htmlFor={emailId}>Email</label>
              <input id={emailId} type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} />
            </div>
            {mode !== 'forgot' && <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor={passwordId}>Password</label>
                {mode === 'login' && <button type="button" className={styles.textButton} disabled={busy} onClick={() => switchMode('forgot')}>Forgot password?</button>}
              </div>
              <div className={styles.passwordField}>
                <input id={passwordId} type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} />
                <button type="button" className={styles.show} onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}><span className="password-bee" aria-hidden="true" /></button>
              </div>
              {mode === 'signup' && <p className={passwordLongEnough ? styles.ruleMet : styles.rule}>{passwordLongEnough && <FiCheck aria-hidden="true" />}At least 8 characters</p>}
            </div>}
            {message && <p className={styles.error} role="alert">{message}</p>}
            <button type="submit" className={styles.primary} disabled={busy}>
              {loading === 'email' ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
            </button>
          </form>

          <p className={styles.switch}>
            {mode === 'signup' ? <>Already have an account? <button type="button" className={styles.textButton} disabled={busy} onClick={() => switchMode('login')}>Sign in</button></>
              : mode === 'login' ? <>New to Litterbugs? <button type="button" className={styles.textButton} disabled={busy} onClick={() => switchMode('signup')}>Create an account</button></>
              : <button type="button" className={styles.textButton} disabled={busy} onClick={() => switchMode('login')}>Back to sign in</button>}
          </p>
          <p className={styles.policy}>By continuing, you agree to our <Link href="/terms">Terms of use</Link> and <Link href="/privacy">Privacy policy</Link>.</p>
          {loading && loading !== 'email' && <p className="sr-only" aria-live="polite">Opening {providerLabel} sign in</p>}
        </>
      )}
    </ModalShell>
  );
}
