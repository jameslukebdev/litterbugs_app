// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('react-native', () => ({
  View: ({children}) => <div>{children}</div>, Text: ({children}) => <span>{children}</span>,
  TouchableOpacity: ({children, onPress, disabled, accessibilityRole, accessibilityLabel, accessibilityState}) => <button role={accessibilityRole} aria-label={accessibilityLabel} aria-checked={accessibilityState?.checked} disabled={disabled} onClick={onPress}>{children}</button>,
  Linking: { openURL: vi.fn() }, StyleSheet: { create: value => value },
}));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
import PhotoReviewChoice from './PhotoReviewChoice';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root;
afterEach(() => { if (root) act(() => root.unmount()); root = null; });
it('requires an affirmative choice, can be withdrawn, and locks during upload', () => {
  const node = document.createElement('div'); root = createRoot(node);
  function Form({disabled}) { const [accepted, setAccepted] = useState(false); return <PhotoReviewChoice accepted={accepted} onChange={setAccepted} disabled={disabled} />; }
  act(() => root.render(<Form />));
  const choice = node.querySelector('[role="checkbox"]');
  expect(choice.getAttribute('aria-checked')).toBe('false');
  expect(node.textContent).toContain('Google Gemini');
  act(() => choice.click()); expect(choice.getAttribute('aria-checked')).toBe('true');
  act(() => choice.click()); expect(choice.getAttribute('aria-checked')).toBe('false');
  act(() => root.render(<Form disabled />));
  act(() => choice.click()); expect(choice.getAttribute('aria-checked')).toBe('false');
});
it('discloses the actual avatar processor and keeps policy links available', () => {
  const node = document.createElement('div'); root = createRoot(node);
  act(() => root.render(<PhotoReviewChoice avatar accepted={false} onChange={() => {}} />));
  expect(node.textContent).toContain('Cloudmersive');
  expect(node.textContent).toContain('Google Gemini');
  expect(node.textContent).not.toContain('cleanup progress');
  expect(node.querySelectorAll('[role="link"]').length).toBe(2);
});
