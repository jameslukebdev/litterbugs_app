// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SignInForm } from './sign-in-form';
import { communityReportHref } from '@/lib/community-journey';
import { getCommunity } from '@/lib/community-directory';
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/components/auth-dialog', () => ({
  authEntryMode: (intent: string | null) => intent === 'report' ? 'signup' : 'login',
  AuthDialog: ({ onClose, onSuccess, intent, initialMode }: { onClose: () => void; onSuccess: () => void; intent?: string | null; initialMode?: string }) => <><button onClick={onClose}>Close</button><button onClick={onSuccess}>Success</button><output data-testid="entry">{`${intent ?? 'none'}:${initialMode}`}</output></>,
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('returns an abandoned community report entry to Boone while success resumes the exact entry', () => {
  const next = communityReportHref(getCommunity('us-nc-boone')!);
  render(<SignInForm next={next} />);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(router.push).toHaveBeenCalledWith('/communities/us/nc/boone');
  fireEvent.click(screen.getByRole('button', { name: 'Success' }));
  expect(router.replace).toHaveBeenCalledWith(next);
  expect(router.refresh).toHaveBeenCalled();
});
it('retains the existing ordinary sign-in close destination', () => {
  render(<SignInForm next="/account" />);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(router.push).toHaveBeenCalledWith('/');
});
it('opens report sign-in on account creation', () => {
  render(<SignInForm next="/report" />);
  expect(screen.getByTestId('entry').textContent).toBe('report:signup');
});
it('keeps ordinary sign-in on the sign-in form', () => {
  render(<SignInForm next="/account" />);
  expect(screen.getByTestId('entry').textContent).toBe('none:login');
});
