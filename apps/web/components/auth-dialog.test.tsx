// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element -- Native image mock for component tests. */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthDialog } from './auth-dialog';

const { signInWithOAuth, signUp } = vi.hoisted(() => ({ signInWithOAuth: vi.fn(), signUp: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { signInWithOAuth, signUp } }) }));
vi.mock('next/image', () => ({ default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

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
