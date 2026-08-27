// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminAccess } from './admin-access';

const refresh = vi.fn();
const signInWithOAuth = vi.fn();
const signOut = vi.fn();
const listFactors = vi.fn();
const unenroll = vi.fn();
const enroll = vi.fn();
const challengeAndVerify = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth,
      signOut,
      mfa: {
        listFactors,
        unenroll,
        enroll,
        challengeAndVerify,
      },
    },
  }),
}));

afterEach(() => {
  cleanup();
  refresh.mockReset();
  signInWithOAuth.mockReset();
  signOut.mockReset();
  listFactors.mockReset();
  unenroll.mockReset();
  enroll.mockReset();
  challengeAndVerify.mockReset();
});

describe('admin access', () => {
  it('returns Google sign-in to the protected admin route', async () => {
    signInWithOAuth.mockResolvedValue({ error: null });

    render(<AdminAccess state="signed_out" />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/admin` },
    }));
    expect((screen.getByRole('button', { name: 'Opening Google…' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps the sign-in form usable when Google cannot start', async () => {
    signInWithOAuth.mockResolvedValue({ error: new Error('offline') });

    render(<AdminAccess state="signed_out" />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Google sign in could not be started.');
    expect((screen.getByRole('button', { name: 'Continue with Google' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByLabelText('Email') as HTMLInputElement).disabled).toBe(false);
  });

  it('denies a signed-in non-member without rendering the operations inbox', async () => {
    signOut.mockResolvedValue({ error: null });

    render(<AdminAccess state="not_authorized" />);

    expect(screen.getByRole('heading', { name: 'Admin access required' })).toBeTruthy();
    expect(screen.getByText(/not on the cleanup admin list/i)).toBeTruthy();
    expect(screen.queryByLabelText('Filter case type')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('requires a six-digit AAL2 challenge for an enrolled administrator', async () => {
    listFactors.mockResolvedValue({
      data: { totp: [{ id: 'factor-verified', status: 'verified' }] },
      error: null,
    });
    challengeAndVerify.mockResolvedValue({ error: null });

    render(<AdminAccess state="mfa_required" />);

    const code = await screen.findByLabelText('6-digit code');
    await waitFor(() => expect(
      (screen.getByRole('button', { name: 'Verify and open inbox' }) as HTMLButtonElement).disabled,
    ).toBe(false));

    fireEvent.change(code, { target: { value: '12a' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and open inbox' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Enter the 6-digit code');
    expect(challengeAndVerify).not.toHaveBeenCalled();

    fireEvent.change(code, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and open inbox' }));
    await waitFor(() => expect(challengeAndVerify).toHaveBeenCalledWith({
      factorId: 'factor-verified',
      code: '123456',
    }));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('replaces incomplete TOTP enrollment and presents the new setup secret', async () => {
    listFactors.mockResolvedValue({
      data: { totp: [{ id: 'factor-incomplete', status: 'unverified' }] },
      error: null,
    });
    unenroll.mockResolvedValue({ error: null });
    enroll.mockResolvedValue({
      data: {
        id: 'factor-new',
        totp: {
          qr_code: 'data:image/svg+xml;base64,PHN2Zy8+',
          secret: 'TESTADMINSECRET',
        },
      },
      error: null,
    });

    render(<AdminAccess state="mfa_required" />);

    await waitFor(() => expect(unenroll).toHaveBeenCalledWith({ factorId: 'factor-incomplete' }));
    expect(enroll).toHaveBeenCalledWith({
      factorType: 'totp',
      friendlyName: 'Litterbugs admin',
    });
    expect(await screen.findByAltText('Authenticator enrollment QR code')).toBeTruthy();
    expect(screen.getByText('TESTADMINSECRET')).toBeTruthy();
  });
});
