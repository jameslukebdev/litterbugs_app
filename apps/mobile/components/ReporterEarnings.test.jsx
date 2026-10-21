// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('react-native', () => ({
  View: ({ children }) => <div>{children}</div>, Text: ({ children }) => <span>{children}</span>,
  ActivityIndicator: () => <span>Loading reporter earnings</span>,
  TouchableOpacity: ({ children, onPress }) => <button onClick={onPress}>{children}</button>,
}));
const state = vi.hoisted(() => ({ resource: {} }));
vi.mock('../lib/useFocusedResource', () => ({ default: () => state.resource }));
vi.mock('../lib/funding', () => ({ formatUsd: cents => `$${(cents / 100).toFixed(2)}`, loadReporterRewards: vi.fn() }));
import { ReporterEarnings } from './ReporterEarnings';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, host;
beforeEach(() => {
  host = document.createElement('div'); root = createRoot(host);
  state.resource = { loading: false, hasLoaded: true, data: [], refresh: vi.fn() };
});
afterEach(async () => { await act(() => root.unmount()); });
const render = onOpenReport => act(() => root.render(<ReporterEarnings userId="owner" onOpenReport={onOpenReport} />));
it('explains empty earnings without displaying a payout as earned', async () => {
  await render(); expect(host.textContent).toContain('No reporter earnings yet');
  expect(host.textContent).toContain('Earn 5%'); expect(host.querySelector('button')).toBeNull();
});
it('shows earned amounts and Stripe transfer status and opens the matching report', async () => {
  state.resource.data = [{ cleanup_attempt_id: 'cleanup', report_id: 'report', amount_cents: 500, status: 'transferred', report: { title: 'Park cleanup' } }];
  const open = vi.fn(); await render(open);
  expect(host.textContent).toContain('$5.00 · Sent to Stripe');
  expect(host.textContent).toContain('Bank arrival follows your Stripe payout schedule');
  await act(() => host.querySelector('button').click()); expect(open).toHaveBeenCalledWith('report');
});
it('offers a retry when rewards cannot load', async () => {
  state.resource.error = new Error('Network unavailable'); await render();
  expect(host.textContent).not.toContain('No reporter earnings yet');
  await act(() => host.querySelector('button').click()); expect(state.resource.refresh).toHaveBeenCalledOnce();
});
