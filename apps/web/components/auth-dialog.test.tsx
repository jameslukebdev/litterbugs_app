// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element -- Native image mock for component tests. */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthDialog, authEntryMode } from './auth-dialog';
import * as browserHandoff from '@/lib/google-browser-handoff';

const { signInWithOAuth, signUp, signInWithPassword, step, failure, sharedSignIn } = vi.hoisted(() => ({ signInWithOAuth: vi.fn(), signUp: vi.fn(), signInWithPassword: vi.fn(), step: vi.fn(), failure: vi.fn(), sharedSignIn: vi.fn() }));
vi.mock('@/lib/website-analytics', () => ({ trackParticipation: step, trackParticipationFailure: failure, trackSharedReportSignIn: sharedSignIn }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { signInWithOAuth, signUp, signInWithPassword } }) }));
vi.mock('next/image', () => ({ default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); vi.useRealTimers(); vi.restoreAllMocks(); vi.resetAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('website social sign-in', () => {
  it.each(['google', 'facebook'] as const)('starts %s with the selected return destination', async (provider) => {
    signInWithOAuth.mockResolvedValue({ error: null });
    render(<AuthDialog onClose={vi.fn()} facebookLoginEnabled returnPath="/account?tab=reports" />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`Continue with ${provider}`, 'i') }));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledWith({
      provider, options: { redirectTo: `${window.location.origin}/auth/callback?next=%2Faccount%3Ftab%3Dreports` },
    }));
    expect((screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it.each(['returned', 'thrown'])('recovers from a %s provider error and allows retry', async (failure) => {
    if (failure === 'returned') signInWithOAuth.mockResolvedValueOnce({ error: new Error('OAuth failed') });
    else signInWithOAuth.mockRejectedValueOnce(new Error('Network failed'));
    render(<AuthDialog onClose={vi.fn()} facebookLoginEnabled />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Facebook' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('try again'));
    expect((screen.getByRole('button', { name: 'Continue with Facebook' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement).disabled).toBe(false);
    signInWithOAuth.mockResolvedValueOnce({ error: null });
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Facebook' }));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(2));
  });

  it('uses the deployment setting to expose Facebook without a component override', () => {
    vi.stubEnv('NEXT_PUBLIC_FACEBOOK_LOGIN_ENABLED', 'true');
    render(<AuthDialog onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Continue with Facebook' })).toBeTruthy();
  });
});

it('retains a specific Boone report, participation intent, and community return through OAuth', async () => {
  signInWithOAuth.mockResolvedValue({ error: null });
  const next = '/map?report=report-id&area=community-us-nc-boone&returnTo=%2Fcommunities%2Fus%2Fnc%2Fboone&intent=clean';
  render(<AuthDialog onClose={vi.fn()} returnPath={next} />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
  await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } }));
});


it.each(['google', 'facebook'])('preserves the confirmed report pin through %s without a separate returnPath', async provider => {
  signInWithOAuth.mockResolvedValue({ error: null });
  const next = '/report?community=us-nc-boone&report_lat=36.123456789&report_lng=-81.987654321#map=36.12,-81.98,14';
  window.history.replaceState({}, '', next);
  render(<AuthDialog onClose={vi.fn()} intent="report" initialMode="signup" />);
  fireEvent.click(screen.getByRole('button', { name: `Continue with ${provider === 'google' ? 'Google' : 'Facebook'}` }));
  await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledWith({ provider, options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } }));
  window.history.replaceState({}, '', '/');
});

it('preserves the confirmed report pin in the email verification link', async () => {
  signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null });
  const next = '/report?report_lat=36.123456789&report_lng=-81.987654321';
  window.history.replaceState({}, '', next);
  render(<AuthDialog onClose={vi.fn()} intent="report" initialMode="signup" />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secure-test-password' } });
  fireEvent.submit(document.querySelector('form')!);
  await screen.findByRole('heading', { name: 'Check your email' });
  expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } }));
  window.history.replaceState({}, '', '/');
});

it('shows creation immediately, keeps signup when opening email, and requests verification', async () => {
  signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null });
  render(<AuthDialog onClose={vi.fn()} initialMode="signup" returnPath="/account" />);
  expect(screen.getByRole('heading', { name: 'Create your account' })).toBeTruthy();
  expect(screen.getByLabelText('Password').getAttribute('autocomplete')).toBe('new-password');
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secure-test-password' } });
  fireEvent.submit(document.querySelector('form')!);
  expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeTruthy();
  expect(signUp).toHaveBeenCalledWith(expect.objectContaining({ options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Faccount` } }));
});

it('removes technical Apple instructions and the sign-in subheading', () => {
  render(<AuthDialog onClose={vi.fn()} />);
  expect(screen.queryByText(/Used Apple/)).toBeNull();
  expect(document.querySelector('.auth-heading p')).toBeNull();
  expect(screen.queryByRole('link', { name: /Apple sign-in/ })).toBeNull();
});

it('recovers from a signup network failure', async () => {
  signUp.mockRejectedValue(new Error('Offline'));
  render(<AuthDialog onClose={vi.fn()} initialMode="signup" />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secure-test-password' } });
  fireEvent.submit(document.querySelector('form')!);
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('try again'));
  expect(screen.getByRole('button', { name: 'Close' }).hasAttribute('disabled')).toBe(false);
});


it('offers email, Google and Facebook to new members', () => {
  render(<AuthDialog onClose={vi.fn()} initialMode="signup" />);
  for (const provider of ['Google', 'Facebook']) {
    expect(screen.getByRole('button', { name: `Continue with ${provider}` })).toBeTruthy();
  }
  expect(screen.getByLabelText('Email')).toBeTruthy();
  expect(screen.queryByText(/Get the app/)).toBeNull();
});


it.each(['login', 'signup'] as const)('does not offer Apple or an app workaround in %s', (initialMode) => {
  render(<AuthDialog onClose={vi.fn()} initialMode={initialMode} />);
  expect(screen.queryByRole('button', { name: /Apple/i })).toBeNull();
  expect(screen.queryByText(/Apple|Get the app/i)).toBeNull();
  expect(screen.getByLabelText('Email')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Continue with Facebook' })).toBeTruthy();
});


it.each(['Instagram 400.0', 'Mozilla/5.0 [FBAN/FBIOS;FBAV/400]'])('keeps email available and explains Google sign-in in %s', (userAgent) => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  render(<AuthDialog onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
  expect(signInWithOAuth).not.toHaveBeenCalled();
  expect(screen.getByRole('alert').textContent).toContain('Safari or Chrome');
  expect((screen.getByLabelText('Email') as HTMLInputElement).disabled).toBe(false);
  expect((screen.getByRole('button', { name: 'Close' }) as HTMLButtonElement).disabled).toBe(false);
});

it('recovers a stalled redirect and restores the dialog controls', async () => {
  vi.useFakeTimers();
  signInWithOAuth.mockResolvedValue({ error: null });
  render(<AuthDialog onClose={vi.fn()} />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' })); });
  expect((screen.getByLabelText('Email') as HTMLInputElement).disabled).toBe(true);
  act(() => { vi.advanceTimersByTime(15000); });
  expect(screen.getByRole('alert').textContent).toContain('Sign in hasn’t opened');
  expect((screen.getByLabelText('Email') as HTMLInputElement).disabled).toBe(false);
  expect((screen.getByRole('button', { name: 'Close' }) as HTMLButtonElement).disabled).toBe(false);
});

it('recovers when returning from OAuth through the back-forward cache', async () => {
  signInWithOAuth.mockResolvedValue({ error: null });
  render(<AuthDialog onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
  await act(async () => { window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });
  expect((screen.getByLabelText('Email') as HTMLInputElement).disabled).toBe(false);
});


it('retains a funding anchor through OAuth when no return path overrides it', async () => {
  window.history.replaceState(null, '', '/fund-a-cleanup#fundable-reports');
  try {
    signInWithOAuth.mockResolvedValue({ error: null });
    render(<AuthDialog onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback?next=%2Ffund-a-cleanup%23fundable-reports` },
    }));
  } finally {
    window.history.replaceState(null, '', '/');
  }
});


it.each(['Android Instagram', 'iPhone Instagram'])('requests an external-browser entry before starting OAuth in %s', userAgent => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  // Do not launch a phone app from jsdom. URL formats are tested separately.
  const handoff = vi.spyOn(browserHandoff, 'googleBrowserHandoff').mockReturnValue(null);
  const next = '/map?report=abc&intent=fund#map=36,-81,12';
  render(<AuthDialog onClose={vi.fn()} returnPath={next} />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
  expect(handoff).toHaveBeenCalledWith(window.location.origin, next, userAgent, false);
  expect(signInWithOAuth).not.toHaveBeenCalled();
  expect((screen.getByLabelText('Email') as HTMLInputElement).disabled).toBe(false);
});

it('measures email sign-in from a shared report without sending credentials', async () => {
  window.history.replaceState(null, '', '/reports/00000000-0000-4000-8000-000000000035');
  signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
  render(<AuthDialog onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'private@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'private-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() => expect(sharedSignIn.mock.calls).toEqual([
    ['prompt_shown'], ['attempted', 'email'], ['succeeded', 'email'],
  ]));
});

it.each([false, true])('uses a shared sign-in marker on a direct map link only (%s opened on map)', async openedOnMap => {
  const next = '/map?report=private';
  window.history.replaceState({ litterbugsReportNavigation: openedOnMap }, '', next);
  signInWithOAuth.mockResolvedValue({ error: null });
  render(<AuthDialog onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
  const callback = new URL(signInWithOAuth.mock.calls[0][0].options.redirectTo);
  expect(callback.searchParams.get('next')).toBe(next);
  expect(callback.searchParams.get('shared_report_auth')).toBe(openedOnMap ? null : 'google');
  expect(sharedSignIn.mock.calls).toEqual(openedOnMap ? [] : [['prompt_shown'], ['attempted', 'google']]);
});

describe('report entry', () => {
  it('leads signed-out reporters with a free account and keeps sign in one tap away', () => {
    render(<AuthDialog onClose={vi.fn()} intent="report" initialMode={authEntryMode('report')} />);
    expect(screen.getByRole('heading', { name: 'Create a free account to report litter' })).toBeTruthy();
    expect(screen.getByLabelText('Password').getAttribute('autocomplete')).toBe('new-password');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('heading', { name: 'Sign in to report litter' })).toBeTruthy();
  });

  it('keeps other entry points on sign in', () => {
    expect(authEntryMode('fund')).toBe('login');
    expect(authEntryMode('clean')).toBe('login');
    expect(authEntryMode(null)).toBe('login');
  });
});

it('records successful email sign-in before returning to the chosen cleanup', async () => {
  signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
  const success = vi.fn();
  render(<AuthDialog intent="clean" onClose={vi.fn()} onSuccess={success} />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'private@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'private-password' } });
  fireEvent.submit(document.querySelector('form')!);
  await waitFor(() => expect(success).toHaveBeenCalledOnce());
  expect(step.mock.calls).toEqual([['clean', 'auth_shown'], ['clean', 'auth_submitted'], ['clean', 'auth_succeeded']]);
  expect(failure).not.toHaveBeenCalled();
});
it('separates verification email sent from an authenticated report return', async () => {
  signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null });
  const success = vi.fn();
  render(<AuthDialog intent="report" initialMode="signup" onClose={vi.fn()} onSuccess={success} />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'private@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'private-password' } });
  fireEvent.submit(document.querySelector('form')!);
  await screen.findByRole('heading', { name: 'Check your email' });
  expect(step).toHaveBeenCalledWith('report', 'verification_sent');
  expect(step).not.toHaveBeenCalledWith('report', 'auth_succeeded');
  expect(success).not.toHaveBeenCalled();
});
it('records a rejected credential attempt without any credential or provider text', async () => {
  signInWithPassword.mockResolvedValue({ error: new Error('private credential detail') });
  render(<AuthDialog intent="fund" onClose={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'private@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'private-password' } });
  fireEvent.submit(document.querySelector('form')!);
  await screen.findByRole('alert');
  expect(failure).toHaveBeenCalledExactlyOnceWith('fund', 'auth_submitted', 'auth_rejected');
  expect(step).not.toHaveBeenCalledWith('fund', 'auth_succeeded');
});
