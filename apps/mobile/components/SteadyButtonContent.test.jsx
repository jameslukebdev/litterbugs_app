// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('react-native', async () => {
  const { createElement } = await import('react');
  return {
    View: ({ children, accessibilityLabel, accessibilityState }) => createElement('div', { 'aria-label': accessibilityLabel, 'aria-busy': accessibilityState?.busy }, children),
    Text: ({ children }) => createElement('span', null, children),
    ActivityIndicator: () => createElement('i', { role: 'progressbar' }),
    StyleSheet: { create: value => value },
  };
});
import SteadyButtonContent from './SteadyButtonContent';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root;
afterEach(() => { if (root) act(() => root.unmount()); root = null; vi.useRealTimers(); });
describe('steady request buttons', () => {
  it('preserves its label while announcing work and only shows progress for a longer request', () => {
    vi.useFakeTimers();
    const node = document.createElement('div'); root = createRoot(node);
    const render = busy => act(() => root.render(<SteadyButtonContent label="Save password" busy={busy} busyLabel="Saving password…" />));
    render(false); render(true);
    expect(node.textContent).toBe('Save password');
    expect(node.querySelector('[aria-busy="true"]')?.getAttribute('aria-label')).toBe('Saving password…');
    act(() => vi.advanceTimersByTime(399));
    expect(node.querySelector('[role="progressbar"]')).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(node.querySelector('[role="progressbar"]')).not.toBeNull();
    render(false);
    expect(node.textContent).toBe('Save password');
    expect(node.querySelector('[role="progressbar"]')).toBeNull();
  });
  it('cancels the delayed spinner if a short request finishes first', () => {
    vi.useFakeTimers();
    const node = document.createElement('div'); root = createRoot(node);
    act(() => root.render(<SteadyButtonContent label="Sign in" busy />));
    act(() => vi.advanceTimersByTime(100));
    act(() => root.render(<SteadyButtonContent label="Sign in" busy={false} />));
    act(() => vi.advanceTimersByTime(500));
    expect(node.textContent).toBe('Sign in');
    expect(node.querySelector('[role="progressbar"]')).toBeNull();
  });
});
