// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('react-native', async () => {
  const { createElement } = await import('react');
  return {
    View: ({ children }) => createElement('div', null, children),
    ScrollView: ({ children }) => createElement('main', null, children),
    Text: ({ children }) => createElement('span', null, children),
    TouchableOpacity: ({ children, onPress, disabled }) => createElement('button', { onClick: onPress, disabled }, children),
    ActivityIndicator: () => createElement('i', { role: 'progressbar' }),
    StyleSheet: { create: value => value },
  };
});
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
import FundingAvailabilityNotice from './FundingAvailabilityNotice';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root;
afterEach(() => { if (root) act(() => root.unmount()); root = null; });
const base = { title: 'Better photos are needed first', message: 'Replace the original photos.', needsPhotos: true };
function render(props) {
  const node = document.createElement('div'); root = createRoot(node);
  act(() => root.render(<FundingAvailabilityNotice {...base} {...props} />));
  return node;
}
describe('funding review recovery', () => {
  it('opens editing for the owner instead of repeating a completed photo review', () => {
    const onEditPhotos = vi.fn();
    const node = render({ canEditPhotos: true, onEditPhotos });
    const buttons = [...node.querySelectorAll('button')];
    expect(buttons.map(button => button.textContent)).toEqual(['Edit photos', 'Return to report']);
    act(() => buttons[0].click());
    expect(onEditPhotos).toHaveBeenCalledOnce();
    expect(node.textContent).toContain('review them automatically');
  });
  it('explains that another reporter must edit without offering an unauthorized action', () => {
    const node = render({ canEditPhotos: false });
    expect([...node.querySelectorAll('button')].map(button => button.textContent)).toEqual(['Return to report']);
    expect(node.textContent).toContain('person who posted this report');
  });
  it('retains the pending status and button text throughout a refresh and its error', () => {
    const onRefresh = vi.fn();
    const props = { needsPhotos: false, pending: true, title: 'Safety review in progress', onRefresh };
    const node = render(props);
    const button = node.querySelector('button');
    act(() => button.click());
    expect(onRefresh).toHaveBeenCalledOnce();
    act(() => root.render(<FundingAvailabilityNotice {...base} {...props} refreshing />));
    expect(node.querySelector('button')).toBe(button);
    expect(button.textContent).toBe('Refresh status');
    expect(button.disabled).toBe(true);
    expect(node.textContent).toContain('Safety review in progress');
    act(() => root.render(<FundingAvailabilityNotice {...base} {...props} refreshError="Offline" />));
    expect(button.disabled).toBe(false);
    expect(node.textContent).toContain('couldn’t refresh');
    expect(node.textContent).toContain('Safety review in progress');
  });
});
