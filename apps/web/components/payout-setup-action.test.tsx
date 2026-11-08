// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PayoutStatus } from '@/lib/funding';
import { PayoutSetupAction } from './payout-setup-action';

const tracking = vi.hoisted(() => vi.fn());
vi.mock('@/lib/website-analytics', () => ({ trackPayoutSetup: tracking }));

const { state, createPayoutLink, createPayoutSession, createPayoutConnect, reusePayoutConnect, notifyDataChanged } = vi.hoisted(() => ({
  state: { status: { onboardingStatus: 'not_started', payoutsEnabled: false, requirementsDue: [] } as PayoutStatus },
  createPayoutLink: vi.fn(),
  createPayoutSession: vi.fn(),
  createPayoutConnect: vi.fn(),
  reusePayoutConnect: vi.fn(),
  notifyDataChanged: vi.fn(),
}));
vi.mock('@/lib/use-data-refresh', () => ({ useDataRefresh: () => 0, notifyDataChanged }));
vi.mock('@/lib/payout-connect', () => ({ createPayoutConnect, reusePayoutConnect }));
vi.mock('@/components/payout-embedded', () => ({ default: ({ onExit, onFallback }: { onExit: () => void; onFallback: () => void }) => <div><h2>Set up your payouts</h2><button onClick={onExit}>Exit secure form</button><button onClick={onFallback}>Continue on Stripe</button></div> }));
vi.mock('@/components/modal-shell', () => ({ ModalShell: ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => <div role="dialog"><button onClick={onClose}>Close</button>{children}</div> }));
vi.mock('@/lib/funding', () => ({
  loadCleanupFeatureFlags: async () => ({ payments_enabled: true }),
  loadPayoutStatus: async () => state.status,
  createPayoutLink,
  createPayoutSession,
}));

beforeEach(() => {
  window.history.replaceState({}, '', '/account/payments');
  localStorage.clear();
  state.status = { onboardingStatus: 'not_started', payoutsEnabled: false, requirementsDue: [] };
  createPayoutSession.mockRejectedValue(new Error('Stripe is unavailable in tests.'));
  createPayoutConnect.mockResolvedValue({});
  reusePayoutConnect.mockResolvedValue(null);
  createPayoutLink.mockRejectedValue(new Error('Stripe is unavailable in tests.'));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function open() {
  render(<PayoutSetupAction />);
  fireEvent.click(await screen.findByRole('button', { name: 'Payout settings' }));
  await screen.findByRole('dialog');
}

it('explains a first-time setup and only continues after the eligibility confirmation', async () => {
  await open();
  await screen.findByRole('heading', { name: 'Get paid for cleanups' });
  const go = screen.getByRole('button', { name: 'Set up payouts' }) as HTMLButtonElement;
  expect(go.disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(go.disabled).toBe(false);
  fireEvent.click(go);
  await waitFor(() => expect(createPayoutSession).toHaveBeenCalledOnce());
  await screen.findByText('Stripe is unavailable in tests.');
  expect(tracking).toHaveBeenCalledWith('start_failed');
  expect(tracking).not.toHaveBeenCalledWith('ready');
});

it('takes returning cleaners directly into the embedded form without another continuation screen', async () => {
  state.status = { onboardingStatus: 'pending', payoutsEnabled: false, requirementsDue: [], age18Confirmed: true };
  createPayoutSession.mockResolvedValue({ clientSecret: 'test_secret', publishableKey: 'pk_test_fixture', expiresAt: 1900000000 });
  await open();
  await screen.findByRole('button', { name: 'Exit secure form' });
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Continue setup' })).toBeNull();
  expect(createPayoutSession).toHaveBeenCalledOnce();
});

it('opens required follow-up details directly for a restricted cleaner', async () => {
  state.status = { onboardingStatus: 'restricted', payoutsEnabled: false, requirementsDue: ['bank', 'id'], age18Confirmed: true };
  createPayoutSession.mockResolvedValue({ clientSecret: 'test_secret', publishableKey: 'pk_test_fixture', expiresAt: 1900000000 });
  await open();
  await screen.findByRole('button', { name: 'Exit secure form' });
  expect(screen.queryByRole('checkbox')).toBeNull();
});

it('opens the Stripe dashboard for ready payouts without asking again, and celebrates once per device', async () => {
  state.status = { onboardingStatus: 'enabled', payoutsEnabled: true, requirementsDue: [] };
  await open();
  await screen.findByRole('heading', { name: 'You’re all set to earn cash' });
  expect(screen.queryByRole('checkbox')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Manage payouts' }));
  await waitFor(() => expect(createPayoutLink).toHaveBeenCalledWith('dashboard'));
  cleanup();
  await open();
  await screen.findByRole('heading', { name: 'Payouts are ready' });
  expect(screen.queryByText('You’re all set to earn cash')).toBeNull();
});

it('still asks for the confirmation when an in-progress member has none on record', async () => {
  state.status = { onboardingStatus: 'pending', payoutsEnabled: false, requirementsDue: [], age18Confirmed: false };
  await open();
  await screen.findByRole('heading', { name: 'Almost there' });
  expect((screen.getByRole('button', { name: 'Review details' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole('checkbox')).toBeTruthy();
});

it('opens straight to payout setup when arriving from the Finish payout setup reminder', async () => {
  state.status = { onboardingStatus: 'pending', payoutsEnabled: false, requirementsDue: ['external_account'], age18Confirmed: true };
  createPayoutSession.mockResolvedValue({ clientSecret: 'test_secret', publishableKey: 'pk_test_fixture', expiresAt: 1900000000 });
  window.history.replaceState({}, '', '/account/connect?payout=finish');
  render(<PayoutSetupAction />);
  await screen.findByRole('button', { name: 'Exit secure form' });
  expect(window.location.search).toBe('');
});


it('opens embedded onboarding after confirmation and only celebrates server-confirmed readiness', async () => {
  createPayoutSession.mockResolvedValue({ clientSecret: 'test_secret', publishableKey: 'pk_test_fixture', expiresAt: 1900000000 });
  await open();
  fireEvent.click(await screen.findByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Set up payouts' }));
  await screen.findByRole('heading', { name: 'Set up your payouts' });
  expect(createPayoutConnect).toHaveBeenCalledOnce();
  expect(createPayoutLink).not.toHaveBeenCalled();
  expect(tracking).toHaveBeenCalledWith('opened');
  expect(tracking).toHaveBeenCalledWith('form_opened');
  expect(tracking).not.toHaveBeenCalledWith('ready');
  state.status = { onboardingStatus: 'pending', payoutsEnabled: false, requirementsDue: [], age18Confirmed: true };
  fireEvent.click(screen.getByRole('button', { name: 'Exit secure form' }));
  await screen.findByRole('heading', { name: 'Almost there' });
  expect(screen.queryByText('You’re all set to earn cash')).toBeNull();
  expect(notifyDataChanged).toHaveBeenCalled();
  expect(tracking).not.toHaveBeenCalledWith('ready');
  fireEvent.click(screen.getByRole('button', { name: 'Review details' }));
  await screen.findByRole('heading', { name: 'Set up your payouts' });
  state.status = { onboardingStatus: 'enabled', payoutsEnabled: true, requirementsDue: [] };
  fireEvent.click(screen.getByRole('button', { name: 'Exit secure form' }));
  await screen.findByRole('heading', { name: 'You’re all set to earn cash' });
  expect(tracking.mock.calls.filter(([stage]) => stage === 'ready')).toHaveLength(1);
});

it('offers hosted recovery after an embedded session fails without redirecting automatically', async () => {
  await open();
  fireEvent.click(await screen.findByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Set up payouts' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Continue on Stripe' }));
  await waitFor(() => expect(createPayoutLink).toHaveBeenCalledWith('link'));
});

it('invalidating the signed-in session closes the embedded payout form', async () => {
  createPayoutSession.mockResolvedValue({ clientSecret: 'test_secret', publishableKey: 'pk_test_fixture', expiresAt: 1900000000 });
  await open();
  fireEvent.click(await screen.findByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Set up payouts' }));
  await screen.findByRole('heading', { name: 'Set up your payouts' });
  const { act } = await import('@testing-library/react');
  act(() => createPayoutConnect.mock.calls[0][1]());
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('keeps preparation quiet and lets a cleaner close without a delayed form reopening', async () => {
  const { act } = await import('@testing-library/react');
  let resolveSession!: (value: unknown) => void;
  createPayoutSession.mockReturnValue(new Promise(resolve => { resolveSession = resolve; }));
  state.status = { onboardingStatus: 'pending', payoutsEnabled: false, requirementsDue: [], age18Confirmed: true };
  await open();
  await waitFor(() => expect(createPayoutSession).toHaveBeenCalledOnce());
  expect(screen.queryByText('Checking your payout status…')).toBeNull();
  expect(screen.queryByRole('button', { name: /Loading|Continue setup/ })).toBeNull();
  expect(screen.getByRole('status').querySelector('.sr-only')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /^Close$/ }));
  await act(async () => resolveSession({ clientSecret: 'secret', publishableKey: 'pk_test_fixture', expiresAt: 1900000000 }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(createPayoutConnect).not.toHaveBeenCalled();
});

it('can retry a failed automatic entry without confirming eligibility again', async () => {
  state.status = { onboardingStatus: 'pending', payoutsEnabled: false, requirementsDue: [], age18Confirmed: true };
  await open();
  await screen.findByText('Stripe is unavailable in tests.');
  createPayoutSession.mockResolvedValue({ clientSecret: 'secret', publishableKey: 'pk_test_fixture', expiresAt: 1900000000 });
  fireEvent.click(screen.getByRole('button', { name: 'Review details' }));
  await screen.findByRole('button', { name: 'Exit secure form' });
  expect(createPayoutSession).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('checkbox')).toBeNull();
});

it('reopens using the signed-in cleaner’s existing instance without creating another session', async () => {
  state.status = { onboardingStatus: 'pending', payoutsEnabled: false, requirementsDue: [], age18Confirmed: true };
  reusePayoutConnect.mockResolvedValue({});
  await open();
  await screen.findByRole('button', { name: 'Exit secure form' });
  expect(createPayoutSession).not.toHaveBeenCalled();
  expect(createPayoutConnect).not.toHaveBeenCalled();
});

it('warms the code on intent without opening setup or creating an account session', async () => {
  render(<PayoutSetupAction />);
  fireEvent.focus(await screen.findByRole('button', { name: 'Payout settings' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(createPayoutSession).not.toHaveBeenCalled();
});

it('opens from a cleanup without another settings button and resumes only after server-confirmed readiness', async () => {
  state.status = { onboardingStatus: 'pending', payoutsEnabled: false, requirementsDue: [], age18Confirmed: true };
  createPayoutSession.mockResolvedValue({ clientSecret: 'secret', publishableKey: 'pk_test_fixture', expiresAt: 1900000000 });
  const onReady = vi.fn(); const onDismiss = vi.fn();
  render(<PayoutSetupAction autoOpen onReady={onReady} onDismiss={onDismiss} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Exit secure form' }));
  await screen.findByRole('heading', { name: 'Almost there' });
  expect(screen.queryByRole('button', { name: 'Payout settings' })).toBeNull();
  expect(onReady).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Review details' }));
  await screen.findByRole('button', { name: 'Exit secure form' });
  state.status = { onboardingStatus: 'enabled', payoutsEnabled: true, requirementsDue: [], age18Confirmed: true };
  fireEvent.click(screen.getByRole('button', { name: 'Exit secure form' }));
  await waitFor(() => expect(onReady).toHaveBeenCalledOnce());
  expect(onDismiss).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('dismisses cleanup entry without claiming readiness', async () => {
  const onReady = vi.fn(); const onDismiss = vi.fn();
  render(<PayoutSetupAction autoOpen onReady={onReady} onDismiss={onDismiss} />);
  await screen.findByRole('heading', { name: 'Get paid for cleanups' });
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(onDismiss).toHaveBeenCalledOnce();
  expect(onDismiss).toHaveBeenCalledWith('closed');
  expect(onReady).not.toHaveBeenCalled();
  expect(createPayoutSession).not.toHaveBeenCalled();
});

it('distinguishes an invalidated payout session from an explicit cleanup cancellation', async () => {
  state.status = { onboardingStatus: 'pending', payoutsEnabled: false, requirementsDue: [], age18Confirmed: true };
  createPayoutSession.mockResolvedValue({ clientSecret: 'secret', publishableKey: 'pk_test_fixture', expiresAt: 1900000000 });
  const onReady = vi.fn(); const onDismiss = vi.fn();
  render(<PayoutSetupAction autoOpen onReady={onReady} onDismiss={onDismiss} />);
  await screen.findByRole('button', { name: 'Exit secure form' });
  const { act } = await import('@testing-library/react');
  act(() => createPayoutConnect.mock.calls[0][1]());
  expect(onDismiss).toHaveBeenCalledExactlyOnceWith('session_ended');
  expect(onReady).not.toHaveBeenCalled();
});
