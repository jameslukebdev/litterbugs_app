// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element -- The test mock intentionally renders a native image. */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setHeaderProfile } from '@/lib/header-profile-cache';
import { PublicAccountAction } from './public-account-action';

const { currentUser, authListener, push } = vi.hoisted(() => ({
  push: vi.fn(),
  currentUser: { fail: false, value: null as null | { id: string; email: string } },
  authListener: { value: null as null | ((event: string, session: unknown) => void) },
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => <img src={src} alt={alt} className={className} />,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/components/auth-dialog', () => ({
  AuthDialog: ({ onClose, initialMode, returnPath }: { onClose: () => void; initialMode: string; returnPath?: string }) => <div role="dialog" aria-label="Sign in" data-mode={initialMode} data-return-path={returnPath}><button onClick={onClose}>Close sign in</button></div>,
}));

vi.mock('@/components/account-dialog', () => ({
  AccountDialog: ({ onClose }: { onClose: () => void }) => <div role="dialog" aria-label="Account"><button onClick={onClose}>Close account</button></div>,
}));

function profileQuery() {
  const builder = {
    eq: () => builder,
    is: async () => ({ count: 3, error: null }),
    maybeSingle: async () => ({
      data: currentUser.value ? {
        id: currentUser.value.id,
        display_name: 'Sam Cleaner',
        username: 'sam.cleaner',
        avatar_path: null,
        provider_avatar_url: 'https://example.com/avatar.jpg',
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
      getUser: async () => { if (currentUser.fail) throw new Error('Offline'); return { data: { user: currentUser.value } }; },
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
  setHeaderProfile(null);
  currentUser.value = null;
  currentUser.fail = false;
  authListener.value = null;
});

describe('PublicAccountAction', () => {
  it('opens sign in for signed-out visitors', async () => {
    render(<PublicAccountAction />);
    const signInButton = await screen.findByRole('button', { name: 'Sign in' });
    expect(screen.getByRole('button', { name: 'Get startedLog in / Sign up' }).classList.contains('public-account-control-signed-out')).toBe(true);
    fireEvent.click(signInButton);
    expect(screen.getByRole('dialog', { name: 'Sign in' })).toBeTruthy();
  });

  it('shows the persistent account after an authenticated session is loaded', async () => {
    currentUser.value = { id: 'member-id', email: 'member@example.com' };
    render(<PublicAccountAction />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Profile' })).toBeTruthy());
    const accountButton = screen.getByRole('button', { name: 'Profile' });
    expect(accountButton.classList.contains('public-account-control-signed-out')).toBe(false);
    fireEvent.click(accountButton);
    expect(push).toHaveBeenCalledWith('/account');
  });
});

it('keeps sign in available if the initial session check fails', async () => {
  currentUser.fail = true;
  render(<PublicAccountAction />);
  expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
  expect(screen.queryByLabelText('Loading profile')).toBeNull();
});

it('omits the compact map profile button for signed-out visitors', async () => {
  const { container } = render(<PublicAccountAction compactOnMobile />);
  await screen.findByRole('button', { name: 'Sign in' });
  const mobile = within(container.querySelector<HTMLElement>('.mobile-map-account')!);
  expect(mobile.queryByRole('button', { name: 'Your profile' })).toBeNull();
  expect(mobile.getByRole('link', { name: 'Updates' }).getAttribute('href')).toBe('/account/notifications');
});

it('opens the account from the compact map header for a signed-in member', async () => {
  currentUser.value = { id: 'member-id', email: 'member@example.com' };
  const { container } = render(<PublicAccountAction compactOnMobile />);
  const mobile = within(container.querySelector<HTMLElement>('.mobile-map-account')!);
  await mobile.findByRole('link', { name: 'Notifications, 3 unread' });
  fireEvent.click(mobile.getByRole('button', { name: 'Your profile' }));
  expect(push).toHaveBeenCalledWith('/account');
});


it('keeps the known photo across a header remount while auth refreshes', async () => {
  currentUser.value = { id: 'member-id', email: 'member@example.com' };
  const first = render(<PublicAccountAction />);
  await waitFor(() => expect(first.container.querySelector('img')?.getAttribute('src')).toBe('https://example.com/avatar.jpg'));
  first.unmount();
  currentUser.fail = true;
  const second = render(<PublicAccountAction />);
  expect(second.container.querySelector('img')?.getAttribute('src')).toBe('https://example.com/avatar.jpg');
  expect(second.container.querySelector('.public-account-initials')?.textContent).toBe('');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Profile' })).toBeTruthy());
});


it('clears the cached photo after sign out', async () => {
  currentUser.value = { id: 'member-id', email: 'member@example.com' };
  const view = render(<PublicAccountAction />);
  await waitFor(() => expect(view.container.querySelector('img')).toBeTruthy());
  currentUser.value = null;
  authListener.value?.('SIGNED_OUT', null);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy());
  expect(view.container.querySelector('.public-account-avatar')).toBeNull();
  view.unmount();
  const next = render(<PublicAccountAction />);
  expect(next.container.querySelector('.public-account-avatar')).toBeNull();
});

it('opens account creation directly from Get started and returns to the profile', async () => {
  render(<PublicAccountAction />);
  fireEvent.click(await screen.findByRole('button', { name: 'Get startedLog in / Sign up' }));
  const dialog = screen.getByRole('dialog', { name: 'Sign in' });
  expect(dialog.getAttribute('data-mode')).toBe('signup');
  expect(dialog.getAttribute('data-return-path')).toBe('/account');
});
