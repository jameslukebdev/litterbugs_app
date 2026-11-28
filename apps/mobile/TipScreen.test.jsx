// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const alert = vi.fn();
vi.mock('react-native', () => ({
  View: ({ children }) => <div>{children}</div>,
  ScrollView: ({ children }) => <div>{children}</div>,
  KeyboardAvoidingView: ({ children }) => <div>{children}</div>,
  Text: ({ children }) => <span>{children}</span>,
  TextInput: ({ value, onChangeText, accessibilityLabel }) => <input aria-label={accessibilityLabel} value={value} onChange={(event) => onChangeText(event.target.value)} />,
  TouchableOpacity: ({ children, onPress, accessibilityLabel, testID }) => <button onClick={onPress} aria-label={accessibilityLabel} data-testid={testID}>{children}</button>,
  StyleSheet: { create: (value) => value },
  Platform: { OS: 'ios' },
  Alert: { alert: (...args) => alert(...args) },
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { extra: {} } } }));
vi.mock('expo-crypto', () => ({ randomUUID: () => 'request-1' }));
vi.mock('@react-navigation/elements', () => ({ useHeaderHeight: () => 0 }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0 }) }));
vi.mock('./ProfileAvatar', () => ({ default: () => null }));
vi.mock('./components/LoadingBee', () => ({ default: ({ label }) => <div>{label}</div> }));
vi.mock('./components/ui', () => ({
  ErrorText: ({ children }) => <p>{children}</p>,
  LoadFailure: ({ title }) => <div>{title}</div>,
  PrimaryButton: ({ label, onPress, disabled }) => <button onClick={onPress} disabled={disabled}>{label}</button>,
  SecondaryButton: ({ label, onPress }) => <button onClick={onPress}>{label}</button>,
}));
vi.mock('./lib/haptics', () => ({ hapticSelect: () => {}, hapticSuccess: () => {} }));
vi.mock('./lib/rankAssets', () => ({ getRankAsset: () => 1 }));
vi.mock('./lib/session', () => ({ useSession: () => ({ user: { id: 'me', email: 'me@example.com' }, isPermanentUser: true }) }));
vi.mock('./lib/supabase', () => ({ supabase: {} }));
vi.mock('./lib/community', async (importOriginal) => ({ ...(await importOriginal()), loadTipRecipient: vi.fn(), startTip: vi.fn() }));
vi.mock('@stripe/stripe-react-native', () => ({
  initStripe: vi.fn(async () => {}),
  initPaymentSheet: vi.fn(async () => ({})),
  presentPaymentSheet: vi.fn(async () => ({})),
  retrievePaymentIntent: vi.fn(async () => ({ paymentIntent: { status: 'Succeeded' } })),
}));

import TipScreen from './TipScreen';
import { loadTipRecipient, startTip } from './lib/community';
import { presentPaymentSheet } from '@stripe/stripe-react-native';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, host;
const goBack = vi.fn();
const recipient = { name: 'Maya R.', avatar_path: null, provider_avatar_url: null, updated_at: '2026-11-01', rank_points: 13, cleanups: 4, reports: 2, can_receive_tips: true };

beforeEach(() => {
  vi.clearAllMocks();
  loadTipRecipient.mockResolvedValue(recipient);
  startTip.mockResolvedValue({ tipId: 't', clientSecret: 'pi_1_secret_2', publishableKey: 'pk_test_1', tipAmountCents: 1000 });
  host = document.createElement('div');
  root = createRoot(host);
});
afterEach(async () => { await act(() => root.unmount()); });

const render = async (params = { profileId: 'maya', role: 'reporter', reportId: 'report-1' }) => {
  await act(async () => { root.render(<TipScreen navigation={{ goBack }} route={{ params }} />); });
  await act(async () => {});
};
const button = (label) => [...host.querySelectorAll('button')].find((node) => node.textContent === label || node.getAttribute('aria-label') === label);

it('shows who the tip is for and what they get, the fee and the total', async () => {
  await render();
  expect(host.textContent).toContain('Maya R.');
  expect(host.textContent).toContain('4 cleanups · 2 reports');
  expect(host.textContent).toContain('Maya R. gets$5.00');
  expect(host.textContent).toContain('Litterbugs service fee$0.75');
  expect(host.textContent).toContain('You pay$5.75');
  await act(async () => { host.querySelector('[data-testid="tip-preset-10"]').click(); });
  expect(host.textContent).toContain('You pay$11.00');
});

it('pays through Stripe and thanks you, sending the role, report and request id', async () => {
  await render();
  await act(async () => { host.querySelector('[data-testid="tip-preset-10"]').click(); });
  await act(async () => { button('Pay $11.00').click(); });
  expect(startTip).toHaveBeenCalledWith(expect.objectContaining({ profileId: 'maya', tipAmountCents: 1000, role: 'reporter', reportId: 'report-1', clientRequestId: 'request-1' }));
  expect(presentPaymentSheet).toHaveBeenCalled();
  expect(host.textContent).toContain('Thanks for tipping Maya R.!');
  expect(host.textContent).toContain('Maya R. gets $10.00.');
  await act(async () => { button('Done').click(); });
  expect(goBack).toHaveBeenCalled();
});

it('closing Stripe’s sheet leaves you on the tip page with nothing charged', async () => {
  presentPaymentSheet.mockResolvedValueOnce({ error: { code: 'Canceled' } });
  await render();
  await act(async () => { button('Pay $5.75').click(); });
  expect(host.textContent).not.toContain('Thanks for tipping');
  expect(host.textContent).toContain('You pay$5.75');
});

it('says when someone can’t be tipped right now', async () => {
  loadTipRecipient.mockResolvedValue({ ...recipient, can_receive_tips: false });
  await render();
  expect(host.textContent).toContain('Maya R. can’t receive tips right now.');
  expect(button('Pay $5.75')).toBeFalsy();
});
