// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element -- Native image mock for component tests. */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthDialog } from './auth-dialog';

const { signInWithOAuth } = vi.hoisted(() => ({ signInWithOAuth: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { signInWithOAuth } }) }));
vi.mock('next/image', () => ({ default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.unstubAllEnvs(); });

describe('website social sign-in', () => {
  it.each(['google', 'facebook'] as const)('starts %s with the selected return destination', async (provider) => {
    signInWithOAuth.mockResolvedValue({ error: null });
    render(<AuthDialog onClose={vi.fn()} facebookLoginEnabled returnPath="/account?tab=reports" />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`Continue with ${provider}`, 'i') }));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledWith({
      provider, options: { redirectTo: `${window.location.origin}/auth/callback?next=%2Faccount%3Ftab%3Dreports` },
    }));
    expect((screen.getByRole('button', { name: 'Continue with Email' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it.each(['returned', 'thrown'])('recovers from a %s provider error and allows retry', async (failure) => {
    if (failure === 'returned') signInWithOAuth.mockResolvedValueOnce({ error: new Error('OAuth failed') });
    else signInWithOAuth.mockRejectedValueOnce(new Error('Network failed'));
    render(<AuthDialog onClose={vi.fn()} facebookLoginEnabled />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Facebook' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('try again'));
    expect((screen.getByRole('button', { name: 'Continue with Facebook' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Continue with Email' }) as HTMLButtonElement).disabled).toBe(false);
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
