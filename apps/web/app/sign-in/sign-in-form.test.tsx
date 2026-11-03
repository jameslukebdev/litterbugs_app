// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SignInForm } from './sign-in-form';
import { communityReportHref } from '@/lib/community-journey';
import { getCommunity } from '@/lib/community-directory';
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/components/auth-dialog', () => ({ AuthDialog: ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => <><button onClick={onClose}>Close</button><button onClick={onSuccess}>Success</button></> }));
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
