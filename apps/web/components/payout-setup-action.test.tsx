// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PayoutStatus } from '@/lib/funding';
import { PayoutSetupAction } from './payout-setup-action';

const { state, createPayoutLink, createPayoutSession, createPayoutConnect, notifyDataChanged } = vi.hoisted(() => ({
  state: { status: { onboardingStatus: 'not_started', payoutsEnabled: false, requirementsDue: [] } as PayoutStatus },
  createPayoutLink: vi.fn(),
  createPayoutSession: vi.fn(),
  createPayoutConnect: vi.fn(),
  notifyDataChanged: vi.fn(),
}));
vi.mock('@/lib/use-data-refresh', () => ({ useDataRefresh: () => 0, notifyDataChanged }));
vi.mock('@/lib/payout-connect', () => ({ createPayoutConnect }));
vi.mock('@/components/payout-embedded', () => ({ default: ({ onExit, onFallback }: { onExit: () => void; onFallback: () => void }) => <div><h2>Set up your payouts</h2><button onClick={onExit}>Exit secure form</button><button onClick={onFallback}>Continue on Stripe</button></div> }));
vi.mock('@/components/modal-shell', () => ({ ModalShell: ({ children }: { children: React.ReactNode }) => <div role="dialog">{children}</div> }));
vi.mock('@/lib/funding', () => ({
  loadCleanupFeatureFlags: async () => ({ payments_enabled: true }),
  loadPayoutStatus: async () => state.status,
  createPayoutLink,
  createPayoutSession,
}));

beforeEach(() => {
  localStorage.clear();
  state.status = { onboardingStatus: 'not_started', payoutsEnabled: false, requirementsDue: [] };
  createPayoutSession.mockRejectedValue(new Error('Stripe is unavailable in tests.'));
  createPayoutConnect.mockResolvedValue({});
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
});

it('tells someone halfway through that they can pick up where they left off', async () => {
  state.status = { onboardingStatus: 'pending', payoutsEnabled: false, requirementsDue: [], age18Confirmed: true };
  await open();
  await screen.findByRole('heading', { name: 'Almost there' });
  // Already confirmed when they started: no checkbox, straight back to Stripe.
  expect(screen.queryByRole('checkbox')).toBeNull();
  const go = screen.getByRole('button', { name: 'Continue setup' }) as HTMLButtonElement;
  expect(go.disabled).toBe(false);
  fireEvent.click(go);
  await waitFor(() => expect(createPayoutSession).toHaveBeenCalledOnce());
});

it('says how many details Stripe still needs', async () => {
  state.status = { onboardingStatus: 'restricted', payoutsEnabled: false, requirementsDue: ['bank', 'id'], age18Confirmed: true };
  await open();
  await screen.findByRole('heading', { name: 'Stripe needs a little more' });
  expect(screen.getByText('Stripe is asking for 2 more details.')).toBeTruthy();
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
  expect((screen.getByRole('button', { name: 'Continue setup' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole('checkbox')).toBeTruthy();
});

it('opens straight to payout setup when arriving from the Finish payout setup reminder', async () => {
  state.status = { onboardingStatus: 'pending', payoutsEnabled: false, requirementsDue: ['external_account'], age18Confirmed: true };
  window.history.replaceState({}, '', '/account/connect?payout=finish');
  render(<PayoutSetupAction />);
  await screen.findByRole('heading', { name: 'Almost there' });
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
  state.status = { onboardingStatus: 'pending', payoutsEnabled: false, requirementsDue: [], age18Confirmed: true };
  fireEvent.click(screen.getByRole('button', { name: 'Exit secure form' }));
  await screen.findByRole('heading', { name: 'Almost there' });
  expect(screen.queryByText('You’re all set to earn cash')).toBeNull();
  expect(notifyDataChanged).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Continue setup' }));
  await screen.findByRole('heading', { name: 'Set up your payouts' });
  state.status = { onboardingStatus: 'enabled', payoutsEnabled: true, requirementsDue: [] };
  fireEvent.click(screen.getByRole('button', { name: 'Exit secure form' }));
  await screen.findByRole('heading', { name: 'You’re all set to earn cash' });
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
