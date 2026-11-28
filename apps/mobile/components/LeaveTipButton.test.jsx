// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const alert = vi.fn();
vi.mock('react-native', () => ({
  Text: ({ children }) => <span>{children}</span>,
  TouchableOpacity: ({ children, onPress, accessibilityLabel }) => <button onClick={onPress} aria-label={accessibilityLabel}>{children}</button>,
  StyleSheet: { create: (value) => value },
  Alert: { alert: (...args) => alert(...args) },
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('../lib/haptics', () => ({ hapticTap: () => {} }));
vi.mock('../lib/community', () => ({ loadTipEligible: vi.fn() }));

import LeaveTipButton from './LeaveTipButton';
import { loadTipEligible } from '../lib/community';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, host;
const onTip = vi.fn();
const cleaner = { id: 'cleaner', display_name: 'Maya Rivera' };
const reporter = { id: 'reporter', display_name: 'Sam Tate' };
beforeEach(() => { vi.clearAllMocks(); host = document.createElement('div'); root = createRoot(host); });
afterEach(async () => { await act(() => root.unmount()); });
const render = async (props) => {
  await act(async () => { root.render(<LeaveTipButton reportId="r" cleaner={cleaner} reporter={reporter} currentUserId="me" onTip={onTip} {...props} />); });
  await act(async () => {});
};

it('asks who to tip when both the cleaner and the reporter can be paid', async () => {
  loadTipEligible.mockResolvedValue(new Set(['cleaner', 'reporter']));
  await render();
  await act(async () => { host.querySelector('button').click(); });
  const [title, , options] = alert.mock.calls[0];
  expect(title).toBe('Who would you like to tip?');
  expect(options.map((option) => option.text)).toEqual(['Cleaner: Maya Rivera', 'Reporter: Sam Tate', 'Cancel']);
  options[1].onPress();
  expect(onTip).toHaveBeenCalledWith({ id: 'reporter', name: 'Sam Tate', role: 'reporter' });
});

it('goes straight to the one person who can be paid', async () => {
  loadTipEligible.mockResolvedValue(new Set(['cleaner']));
  await render();
  expect(host.querySelector('button').getAttribute('aria-label')).toBe('Leave a tip for Maya Rivera');
  await act(async () => { host.querySelector('button').click(); });
  expect(alert).not.toHaveBeenCalled();
  expect(onTip).toHaveBeenCalledWith({ id: 'cleaner', name: 'Maya Rivera', role: 'cleaner' });
});

it('is hidden when nobody can be tipped, and never offers to tip yourself', async () => {
  loadTipEligible.mockResolvedValue(new Set(['me']));
  await render({ cleaner: { id: 'me', display_name: 'Me' }, reporter: null });
  expect(loadTipEligible).not.toHaveBeenCalled();
  expect(host.querySelector('button')).toBeNull();
  loadTipEligible.mockResolvedValue(new Set());
  await render();
  expect(host.querySelector('button')).toBeNull();
});
