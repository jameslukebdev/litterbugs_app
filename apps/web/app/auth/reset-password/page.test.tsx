// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import ResetPasswordPage from './page';

const auth = {
  exchangeCodeForSession: vi.fn(),
  getSession: vi.fn(),
  updateUser: vi.fn(),
  resetPasswordForEmail: vi.fn(),
};
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth }) }));

beforeEach(() => {
  for (const fn of Object.values(auth)) fn.mockReset();
  auth.exchangeCodeForSession.mockResolvedValue({ error: null });
  auth.updateUser.mockResolvedValue({ error: null });
  auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  window.history.replaceState({}, '', '/auth/reset-password?code=recovery-code');
});
afterEach(cleanup);

it('saves a new password from a valid link', async () => {
  auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
  render(<ResetPasswordPage />);
  const field = await screen.findByLabelText('New password');
  expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('recovery-code');
  expect(window.location.search).toBe('');

  fireEvent.change(field, { target: { value: 'short' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
  expect((await screen.findByRole('alert')).textContent).toContain('at least 8 characters');
  expect(auth.updateUser).not.toHaveBeenCalled();

  fireEvent.change(field, { target: { value: 'a-new-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
  expect(await screen.findByRole('heading', { name: 'Password updated' })).toBeTruthy();
  expect(auth.updateUser).toHaveBeenCalledWith({ password: 'a-new-password' });
  expect(screen.getByRole('link', { name: 'Go to the map' }).getAttribute('href')).toBe('/map');
});

it('offers a new link when the reset link has expired', async () => {
  auth.exchangeCodeForSession.mockResolvedValue({ error: new Error('expired') });
  auth.getSession.mockResolvedValue({ data: { session: null } });
  render(<ResetPasswordPage />);
  expect(await screen.findByRole('heading', { name: 'This link has expired' })).toBeTruthy();
  expect(screen.queryByLabelText('New password')).toBeNull();

  fireEvent.change(screen.getByLabelText('Email'), { target: { value: ' Me@Example.com ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send a new link' }));
  expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeTruthy();
  expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('me@example.com', { redirectTo: `${window.location.origin}/auth/reset-password` });
});
