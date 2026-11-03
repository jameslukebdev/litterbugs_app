// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  View: ({ children }) => <div>{children}</div>,
  ScrollView: ({ children }) => <div>{children}</div>,
  Text: ({ children }) => <span>{children}</span>,
  ActivityIndicator: () => <span>Loading</span>,
  TouchableOpacity: ({ children, onPress, disabled, accessibilityRole, accessibilityState }) =>
    <button disabled={disabled} onClick={onPress} role={accessibilityRole}
      aria-checked={accessibilityState?.checked}>{children}</button>,
  StyleSheet: { create: value => value },
  Alert: { alert: vi.fn() },
  AppState: { addEventListener: () => ({ remove() {} }) },
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
vi.mock('./lib/session', () => ({ useSession: () => ({ user: { id: 'test-member' } }) }));
vi.mock('./lib/funding', () => ({
  loadPayoutStatus: vi.fn(), createPayoutOnboardingLink: vi.fn(), createPayoutDashboardLink: vi.fn(),
}));
vi.mock('expo-web-browser', () => ({
  WebBrowserPresentationStyle: { FORM_SHEET: 'formSheet' },
  openBrowserAsync: vi.fn(), openAuthSessionAsync: vi.fn(),
}));
vi.mock('./lib/payoutWorkflowGate', () => ({
  cancelPayoutWorkflow: vi.fn(), markPayoutWorkflowReady: vi.fn(),
  isPayoutConnectionReady: value => value?.payoutsEnabled === true,
  payoutWorkflowCopy: () => null, waitForPayoutConnection: vi.fn(),
}));

import PayoutSetupScreen from './PayoutSetupScreen';
import { createPayoutDashboardLink, createPayoutOnboardingLink, loadPayoutStatus } from './lib/funding';
import { openAuthSessionAsync, openBrowserAsync } from 'expo-web-browser';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, host;
beforeEach(() => {
  vi.clearAllMocks();
  host = document.createElement('div'); root = createRoot(host);
  createPayoutOnboardingLink.mockResolvedValue({ url: 'https://example.com/test-onboarding' });
  createPayoutDashboardLink.mockResolvedValue({ url: 'https://example.com/test-dashboard' });
  openAuthSessionAsync.mockResolvedValue({ type: 'cancel' });
  openBrowserAsync.mockResolvedValue({ type: 'opened' });
});
afterEach(async () => { await act(() => root.unmount()); });
const button = label => [...host.querySelectorAll('button')].find(node => node.textContent === label);
async function render(status) {
  loadPayoutStatus.mockResolvedValue(status);
  await act(async () => root.render(<PayoutSetupScreen route={{ params: {} }}
    navigation={{ addListener: () => () => {}, goBack: vi.fn() }} />));
}

it('requires the first eligibility confirmation before opening the secure payout form', async () => {
  await render({ onboardingStatus: 'not_started', payoutsEnabled: false, requirementsDue: [] });
  expect(button('Set up payouts').disabled).toBe(true);
  await act(() => host.querySelector('[role="checkbox"]').click());
  expect(button('Set up payouts').disabled).toBe(false);
  await act(() => button('Set up payouts').click());
  expect(createPayoutOnboardingLink).toHaveBeenCalledOnce();
  expect(openAuthSessionAsync).toHaveBeenCalledWith('https://example.com/test-onboarding',
    'litterbugs://stripe-onboarding-return', expect.objectContaining({ createTask: false }));
  expect(createPayoutDashboardLink).not.toHaveBeenCalled();
});

it('lets an already-confirmed member resume missing-information setup without another checkbox', async () => {
  await render({ onboardingStatus: 'pending', payoutsEnabled: false, age18Confirmed: true,
    requirementsDue: ['identity.individual.given_name'] });
  expect(host.textContent).toContain('Legal name');
  expect(host.querySelector('[role="checkbox"]')).toBeNull();
  expect(button('Continue payout setup').disabled).toBe(false);
  const buttons = [...host.querySelectorAll('button')];
  expect(buttons.indexOf(button('Continue payout setup'))).toBeGreaterThan(-1);
  expect(button('Continue payout setup').compareDocumentPosition([...host.querySelectorAll('span')].find(node => node.textContent === 'What to expect')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  await act(() => button('Continue payout setup').click());
  expect(createPayoutOnboardingLink).toHaveBeenCalledOnce();
});

it('opens current remediation while preserving an enabled account’s readiness', async () => {
  await render({ onboardingStatus: 'enabled', payoutsEnabled: true, age18Confirmed: true,
    requirementsDue: ['identity.individual.id_numbers.us_ssn_last_4'] });
  expect(host.textContent).toContain('Your payouts are enabled.');
  await act(() => button('Update payout details').click());
  expect(createPayoutOnboardingLink).toHaveBeenCalledOnce();
  expect(openAuthSessionAsync).toHaveBeenCalledOnce();
  expect(createPayoutDashboardLink).not.toHaveBeenCalled();
});

it('opens the payout dashboard directly when Stripe has no current remediation', async () => {
  await render({ onboardingStatus: 'enabled', payoutsEnabled: true, age18Confirmed: true, requirementsDue: [] });
  expect(host.textContent).not.toContain('in review');
  expect(host.textContent).not.toContain('What to expect');
  expect(host.querySelector('[role="checkbox"]')).toBeNull();
  await act(() => button('Review payout details').click());
  expect(createPayoutDashboardLink).toHaveBeenCalledOnce();
  expect(openBrowserAsync).toHaveBeenCalledWith('https://example.com/test-dashboard',
    expect.objectContaining({ createTask: false }));
  expect(createPayoutOnboardingLink).not.toHaveBeenCalled();
});

it('lets members review a pending setup without implying they must start again', async () => {
  await render({ onboardingStatus: 'pending', payoutsEnabled: false, age18Confirmed: true, requirementsDue: [] });
  expect(host.textContent).toContain('Stripe is checking your payout setup');
  expect(button('Review payout setup').disabled).toBe(false);
  expect(button('Set up payouts')).toBeUndefined();
  expect(host.querySelector('[role="checkbox"]')).toBeNull();
  expect(openAuthSessionAsync).not.toHaveBeenCalled();
});
