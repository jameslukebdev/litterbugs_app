// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({
  platform: { OS: 'ios' },
  pan: null,
  scroll: null,
  height: 568,
  fontScale: 1,
  reduced: false,
  timings: [],
  values: [],
}));
vi.mock('react-native', () => {
  const Box = ({ children, onAccessibilityEscape }) => <div onKeyDown={(event) => { if (event.key === 'Escape') onAccessibilityEscape?.(); }}>{children}</div>;
  class Value {
    constructor(value) { this.value = value; native.values.push(this); }
    interpolate(config) { return config.outputRange[this.value === 1 ? 1 : 0]; }
    setValue(value) { this.value = value; }
    stopAnimation() {}
  }
  const animate = (value, config) => ({ start: (callback) => {
    native.timings.push(config);
    value.setValue(config.toValue);
    callback?.({ finished: true });
  } });
  return {
    Platform: native.platform,
    AccessibilityInfo: { isReduceMotionEnabled: async () => native.reduced, addEventListener: () => ({ remove() {} }) },
    useWindowDimensions: () => ({ width: 320, height: native.height, fontScale: native.fontScale }),
    Animated: { Value, View: Box, add: (a, b) => a + b.value, timing: animate, spring: animate },
    PanResponder: { create: (config) => { native.pan = config; return { panHandlers: {} }; } },
    View: Box, Text: Box,
    ScrollView: (props) => { native.scroll = props; return <div>{props.children}</div>; },
    TouchableOpacity: ({ children, accessibilityLabel, onPress }) => <button aria-label={accessibilityLabel} onClick={onPress}>{children}</button>,
    Modal: ({ visible, children }) => visible ? children : null,
    FlatList: () => null,
    StyleSheet: { create: value => value, absoluteFill: {}, hairlineWidth: 1 },
  };
});
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('./ReportCardDetails', () => ({ default: ({ actions }) => <div>{actions}</div> }));
vi.mock('./ReportCardMenu', () => ({ default: () => null }));
vi.mock('./ReportPreviewPhoto', () => ({ default: () => null }));
vi.mock('./ReportPreviewHero', () => ({ default: ({ onPress }) => <button onClick={onPress}>Open report</button> }));
vi.mock('./BrandBug', () => ({ default: () => null }));
vi.mock('./SlideUp', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../lib/haptics', () => ({ hapticTap() {} }));

import MapReportPreview from './MapReportPreview';

let root;
let container;
let previousActEnvironment;
const report = { id: 'a', cleanup_state: 'available', title: 'Litter by the road' };
async function mount(props = {}) {
  const onClose = vi.fn();
  await act(async () => root.render(<MapReportPreview report={report} bottom={100} insetTop={20} insetBottom={0} onClose={onClose} {...props} />));
  return onClose;
}
const gesture = (values = {}) => ({ dx: 0, dy: 0, vy: 0, ...values });

beforeEach(() => {
  previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  native.platform.OS = 'ios';
  native.height = 568;
  native.fontScale = 1;
  native.reduced = false;
  native.timings = [];
  native.values = [];
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
});

describe.each(['ios', 'android'])('%s report preview dismissal', (platform) => {
  beforeEach(() => { native.platform.OS = platform; });

  it('keeps a reachable close button on a short phone and dismisses on press', async () => {
    const close = await mount();
    const closeButton = container.querySelector('[aria-label="Back to map"]');
    expect(closeButton).not.toBeNull();
    expect(container.querySelector('button')).toBe(closeButton);
    expect(native.scroll.style.maxHeight).toBeLessThan(568 - 100 - 20);
    act(() => closeButton.click());
    expect(close).toHaveBeenCalledOnce();
  });

  it('dismisses a downward pull from the top without stealing content or sideways scrolling', async () => {
    const close = await mount();
    const capture = values => native.pan.onMoveShouldSetPanResponderCapture(null, gesture(values));
    expect(capture({ dy: 30 })).toBe(true);
    expect(capture({ dy: -90 })).toBe(false);
    expect(capture({ dx: 80, dy: 25 })).toBe(false);
    native.scroll.onScroll({ nativeEvent: { contentOffset: { y: 80 } } });
    expect(capture({ dy: 90 })).toBe(false);
    native.scroll.onScroll({ nativeEvent: { contentOffset: { y: 0 } } });
    expect(capture({ dy: 90 })).toBe(true);
    act(() => native.pan.onPanResponderRelease(null, gesture({ dy: 95 })));
    expect(close).toHaveBeenCalledOnce();
  });

  it('cancels a short pull and accepts an intentional downward flick', async () => {
    const close = await mount();
    act(() => {
      native.pan.onPanResponderMove(null, gesture({ dy: 25 }));
      native.pan.onPanResponderRelease(null, gesture({ dy: 25 }));
    });
    expect(close).not.toHaveBeenCalled();
    expect(native.values.at(-1).value).toBe(0);
    act(() => native.pan.onPanResponderRelease(null, gesture({ dy: 30, vy: 1 })));
    expect(close).toHaveBeenCalledOnce();
  });

  it('still opens the report and its funding action on tap', async () => {
    const onDetails = vi.fn();
    const onFund = vi.fn();
    const close = await mount({ onDetails, onFund, canFund: true });
    act(() => {
      container.querySelector('button:not([aria-label])').click();
      container.querySelector('[aria-label="Fund cleanup"]').click();
    });
    expect(onDetails).toHaveBeenCalledOnce();
    expect(onFund).toHaveBeenCalledWith(report);
    expect(close).not.toHaveBeenCalled();
  });
});

it('skips automatic sheet motion for the reduced-motion preference', async () => {
  native.reduced = true;
  await mount();
  expect(native.timings).toContainEqual(expect.objectContaining({ toValue: 1, duration: 0 }));
  expect(native.timings.some(config => config.duration > 0)).toBe(false);
});
