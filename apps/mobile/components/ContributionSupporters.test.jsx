// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const fixtures = vi.hoisted(() => ({ resource: { data: null }, rpc: vi.fn() }));
vi.mock('react-native', () => ({
  View: ({ children, testID }) => <div data-testid={testID}>{children}</div>,
  Text: ({ children }) => <span>{children}</span>,
  TouchableOpacity: ({ children, onPress, disabled, accessibilityRole, accessibilityLabel, accessibilityState }) => <button
    onClick={onPress} disabled={disabled} role={accessibilityRole} aria-label={accessibilityLabel}
    aria-checked={accessibilityState?.checked} aria-expanded={accessibilityState?.expanded}>{children}</button>,
  StyleSheet: { create: value => value },
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('../lib/useFocusedResource', () => ({ default: () => fixtures.resource }));
vi.mock('../lib/supabase', () => ({ supabase: { rpc: fixtures.rpc } }));
vi.mock('../lib/funding', () => ({ formatUsd: cents => `$${(cents / 100).toFixed(2)}` }));
import ContributionSupporters, { ContributionSupporterCredit } from './ContributionSupporters';
import { AnonymousDonationChoice } from './DonationPrivacy';
import ContributionPrivacyControl from './ContributionPrivacyControl';

const credit = { report_id: 'report', donations: [
  { name: 'Alex', amountCents: 2500, donatedAt: '2026-11-19T12:00:00Z' },
  { name: null, amountCents: 500, donatedAt: '2026-11-18T12:00:00Z' },
  { name: 'Alex', amountCents: 1000, donatedAt: '2026-11-17T12:00:00Z' },
  { name: 'Fourth donor', amountCents: 200, donatedAt: '2026-11-16T12:00:00Z' },
] };
let root, container;
const render = ui => act(async () => { root.render(ui); });
const click = button => act(async () => { button.click(); });
describe('native donor display and privacy interactions', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    fixtures.resource = { data: null }; fixtures.rpc.mockReset();
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
  it('shows individual donations, anonymity, amounts and dates, with an expandable list', async () => {
    await render(<ContributionSupporterCredit credit={credit} now={Date.parse('2026-11-20T12:00:00Z')} />);
    expect(container.textContent).toContain('Anonymous$5.00 · 2 days ago');
    expect(container.textContent).toContain('Alex$25.00 · 1 day ago');
    expect(container.textContent).toContain('Alex$10.00 · 3 days ago');
    expect(container.textContent).not.toContain('Fourth donor');
    await click(container.querySelector('button'));
    expect(container.textContent).toContain('Fourth donor$2.00');
    expect(container.textContent).toContain('Show fewer donations');
    await click(container.querySelector('button'));
    expect(container.textContent).not.toContain('Fourth donor');
  });
  it('resets an expanded list when switching reports and hides empty lists', async () => {
    await render(<ContributionSupporterCredit credit={credit} />);
    await click(container.querySelector('button'));
    await render(<ContributionSupporterCredit credit={{ ...credit, report_id: 'other' }} />);
    expect(container.textContent).not.toContain('Fourth donor');
    await render(<ContributionSupporterCredit credit={{ report_id: 'empty', donations: [] }} />);
    expect(container.innerHTML).toBe('');
  });
  it('does not expose stale credit on another report, a closed sheet, or failed refresh', async () => {
    fixtures.resource = { data: credit };
    await render(<ContributionSupporters reportId="other" visible />);
    expect(container.innerHTML).toBe('');
    await render(<ContributionSupporters reportId="report" visible={false} />);
    expect(container.innerHTML).toBe('');
    fixtures.resource = { data: credit, error: Error('offline') };
    await render(<ContributionSupporters reportId="report" visible />);
    expect(container.innerHTML).toBe('');
  });
  it('offers an unchecked anonymous choice and respects a saved checkout choice', async () => {
    const onChange = vi.fn();
    await render(<AnonymousDonationChoice shown onChange={onChange} />);
    const checkbox = container.querySelector('[role=checkbox]');
    expect(checkbox.getAttribute('aria-checked')).toBe('false');
    await click(checkbox); expect(onChange).toHaveBeenCalledWith(false);
    await render(<AnonymousDonationChoice shown={false} onChange={onChange} locked />);
    expect(container.querySelector('button').disabled).toBe(true);
    expect(container.textContent).toContain('Your name will be hidden.');
  });
  it('waits for a confirmed privacy save, ignores double taps, and can restore a name', async () => {
    let finish;
    fixtures.rpc.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const onSaved = vi.fn();
    await render(<ContributionPrivacyControl item={{ id: 'owned', show_contributor_name: null }} onSaved={onSaved} />);
    await click(container.querySelector('button'));
    await click(container.querySelector('button'));
    expect(fixtures.rpc).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Your name is shown.');
    expect(container.textContent).toContain('Saving…');
    await act(async () => finish({ data: true }));
    expect(container.textContent).toContain('You’re listed as Anonymous.');
    expect(onSaved).toHaveBeenCalledOnce();
    fixtures.rpc.mockResolvedValue({ data: true });
    await click(container.querySelector('button'));
    expect(fixtures.rpc).toHaveBeenLastCalledWith('set_cleanup_contributor_visibility', { contribution_id: 'owned', show_name: true });
    expect(container.textContent).toContain('Your name is shown.');
  });
  it('keeps the prior privacy setting when the server denies or fails the change', async () => {
    fixtures.rpc.mockResolvedValue({ data: false });
    await render(<ContributionPrivacyControl item={{ id: 'owned', show_contributor_name: false }} />);
    await click(container.querySelector('button'));
    expect(container.textContent).toContain('You’re listed as Anonymous.');
    expect(container.textContent).toContain('could not be saved');
  });
});
