// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element -- The test mock intentionally renders a native image. */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PublicAccountAction } from './public-account-action';

const { currentUser, authListener } = vi.hoisted(() => ({
  currentUser: { value: null as null | { id: string; email: string } },
  authListener: { value: null as null | ((event: string, session: unknown) => void) },
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => <img src={src} alt={alt} className={className} />,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/components/auth-dialog', () => ({
  AuthDialog: ({ onClose }: { onClose: () => void }) => <div role="dialog" aria-label="Sign in"><button onClick={onClose}>Close sign in</button></div>,
}));

vi.mock('@/components/account-dialog', () => ({
  AccountDialog: ({ onClose }: { onClose: () => void }) => <div role="dialog" aria-label="Account"><button onClick={onClose}>Close account</button></div>,
}));

function profileQuery() {
  const builder = {
    eq: () => builder,
    maybeSingle: async () => ({
      data: currentUser.value ? {
        id: currentUser.value.id,
        display_name: 'Sam Cleaner',
        username: 'sam.cleaner',
        avatar_path: null,
        provider_avatar_url: null,
        profile_completed_at: '2026-08-01T00:00:00.000Z',
        updated_at: '2026-08-01T00:00:00.000Z',
      } : null,
      error: null,
    }),
    select: () => builder,
  };
  return builder;
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: currentUser.value } }),
      onAuthStateChange: (listener: (event: string, session: unknown) => void) => {
        authListener.value = listener;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    from: () => profileQuery(),
    storage: {
      from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }),
    },
  }),
}));

afterEach(() => {
  cleanup();
  currentUser.value = null;
  authListener.value = null;
});

describe('PublicAccountAction', () => {
  it('opens sign in for signed-out visitors', async () => {
    render(<PublicAccountAction />);
    const signInButton = await screen.findByRole('button', { name: 'Sign in' });
    expect(signInButton.classList.contains('public-account-control-signed-out')).toBe(true);
    fireEvent.click(signInButton);
    expect(screen.getByRole('dialog', { name: 'Sign in' })).toBeTruthy();
  });

  it('shows the persistent account after an authenticated session is loaded', async () => {
    currentUser.value = { id: 'member-id', email: 'member@example.com' };
    render(<PublicAccountAction />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Account' })).toBeTruthy());
    const accountButton = screen.getByRole('button', { name: 'Account' });
    expect(accountButton.classList.contains('public-account-control-signed-out')).toBe(false);
    fireEvent.click(accountButton);
    expect(screen.getByRole('dialog', { name: 'Account' })).toBeTruthy();
  });
});
