// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
const settings = vi.hoisted(() => vi.fn());
vi.mock('react-native', () => {
  const Box = ({ children, accessibilityRole, accessibilityLabel, onPress }) => <div role={accessibilityRole === 'header' ? 'heading' : accessibilityRole} aria-label={accessibilityLabel} onClick={onPress}>{children}</div>;
  return { View: Box, Text: Box, ScrollView: Box, TouchableOpacity: Box, Modal: ({ children, visible }) => visible ? children : null, Linking: { openSettings: settings }, StyleSheet: { create: value => value, absoluteFillObject: {} } };
});
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('./SlideUp', () => ({ default: ({ children }) => <div>{children}</div> }));
import { ReportLocationRecoveryContent } from './ReportLocationRecovery';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, container;
const render = node => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); act(() => root.render(node)); };
const button = name => Array.from(container.querySelectorAll('[role="button"]')).find(node => node.textContent === name);
const click = node => act(() => node.click());
afterEach(() => { act(() => root?.unmount()); container?.remove(); vi.resetAllMocks(); });
describe('native report location recovery', () => {
  it('offers a retry without discarding the pin or report', () => {
    const retry = vi.fn(), dismiss = vi.fn();
    render(<ReportLocationRecoveryContent reason="location_timeout" inForm onRetry={retry} onDismiss={dismiss} />);
    click(button('Try again'));
    expect(retry).toHaveBeenCalledOnce();
    expect(container.textContent).toContain('Your report pin is kept');
    click(button('Back to report'));
    expect(dismiss).toHaveBeenCalledOnce();
  });
  it('explains manual settings recovery if the phone cannot open settings', async () => {
    settings.mockRejectedValue(new Error('Unavailable'));
    render(<ReportLocationRecoveryContent reason="location_denied" onRetry={vi.fn()} onDismiss={vi.fn()} />);
    await act(async () => button('Open location settings').click());
    expect(settings).toHaveBeenCalledOnce();
    expect(container.querySelector('[role="alert"]').textContent).toContain('choose Litterbugs');
  });
  it('asks for a closer pin rather than settings when outside 50 miles', () => {
    render(<ReportLocationRecoveryContent reason="location_out_of_range" onRetry={vi.fn()} onDismiss={vi.fn()} />);
    expect(button('Open location settings')).toBeUndefined();
    expect(container.textContent).toContain('within 50 miles');
  });
});
