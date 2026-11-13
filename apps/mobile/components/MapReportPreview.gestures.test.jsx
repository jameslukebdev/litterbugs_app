// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({
  platform: { OS: 'ios' },
  pan: null,
  headerPan: null,
  pans: [],
  scroll: null,
  height: 568,
  fontScale: 1,
  reduced: false,
  timings: [],
  values: [],
  layout: null,
  animations: [],
  autoFinish: true,
}));
vi.mock('react-native', () => {
  const Box = ({ children, onAccessibilityEscape, onLayout }) => {
    if (onLayout) native.layout = onLayout;
    return <div onKeyDown={(event) => { if (event.key === 'Escape') onAccessibilityEscape?.(); }}>{children}</div>;
  };
  class Value {
    constructor(value) { this.value = value; native.values.push(this); }
    interpolate(config) { return config.outputRange[this.value === 1 ? 1 : 0]; }
    setValue(value) { this.value = value; }
    stopAnimation() {}
  }
  const animate = (value, config) => {
    const movement = { value, config, stop: vi.fn(), start: (callback) => {
      movement.complete = callback;
      native.animations.push(movement);
      native.timings.push(config);
      if (native.autoFinish) {
        value.setValue(config.toValue);
        callback?.({ finished: true });
      }
    } };
    return movement;
  };
  return {
    Platform: native.platform,
    Easing: { quad: value => value * value, inOut: easing => easing },
    AccessibilityInfo: { isReduceMotionEnabled: async () => native.reduced, addEventListener: () => ({ remove() {} }) },
    useWindowDimensions: () => ({ width: 320, height: native.height, fontScale: native.fontScale }),
    Animated: { Value, View: Box, add: (a, b) => (a.value ?? a) + b.value, timing: animate, spring: animate },
    PanResponder: { create: (config) => { native[native.pans.length % 2 === 0 ? 'pan' : 'headerPan'] = config; native.pans.push(config); return { panHandlers: {} }; } },
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
  native.pans = [];
  native.layout = null;
  native.animations = [];
  native.autoFinish = true;
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

  it('keeps the fixed dismissal controls below the selected pin on a compact map', async () => {
    const close = await mount({ minimumTop: 160 });
    expect(native.scroll.style.maxHeight).toBeLessThanOrEqual(native.height - 100 - 160 - 36);
    const button = container.querySelector('[aria-label="Back to map"]');
    expect(button).not.toBeNull();
    act(() => button.click());
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

  it('lets the fixed grab bar dismiss even after the contents have scrolled', async () => {
    const close = await mount();
    native.scroll.onScroll({ nativeEvent: { contentOffset: { y: 120 } } });
    expect(native.pan.onMoveShouldSetPanResponderCapture(null, gesture({ dy: 90 }))).toBe(false);
    expect(native.headerPan.onMoveShouldSetPanResponderCapture(null, gesture({ dy: 90 }))).toBe(true);
    expect(native.headerPan.onMoveShouldSetPanResponderCapture(null, gesture({ dy: -90 }))).toBe(false);
    act(() => native.headerPan.onPanResponderRelease(null, gesture({ dy: 95 })));
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


it('preserves the approved iPhone entry and exit timing without waiting for Android layout', async () => {
  await mount();
  expect(native.layout).toBeNull();
  expect(native.timings.at(-1)).toMatchObject({ toValue: 1, duration: 240, useNativeDriver: true });
  await mount({ report: null });
  expect(native.timings.at(-1)).toMatchObject({ toValue: 0, duration: 180, useNativeDriver: true });
  expect(container.querySelector('[aria-label="Back to map"]')).toBeNull();
});

describe('Android native card transitions', () => {
  beforeEach(() => { native.platform.OS = 'android'; });
  const measure = (height = 300) => act(() => native.layout({ nativeEvent: { layout: { height } } }));

  it('waits for native layout, then slides only the distance needed to clear the bottom', async () => {
    native.autoFinish = false;
    await mount();
    expect(native.timings).toHaveLength(0);
    measure();
    expect(native.animations).toHaveLength(1);
    const entrance = native.animations[0];
    expect(entrance.value.value).toBe(300 + 100 + 24);
    expect(entrance.config).toMatchObject({ toValue: 0, duration: 360, useNativeDriver: true });
    // A later photo/content layout must not restart the entrance mid-slide.
    measure(310);
    expect(native.animations).toHaveLength(1);
  });

  it('keeps the card mounted until its downward slide finishes', async () => {
    await mount();
    measure();
    native.autoFinish = false;
    await mount({ report: null });
    expect(container.querySelector('[aria-label="Back to map"]')).not.toBeNull();
    const exit = native.animations.at(-1);
    expect(exit.config).toMatchObject({ toValue: 424, duration: 280, useNativeDriver: true });
    act(() => exit.complete({ finished: true }));
    expect(container.querySelector('[aria-label="Back to map"]')).toBeNull();
  });

  it('does not let an old exit remove a newly selected report', async () => {
    await mount();
    measure();
    native.autoFinish = false;
    await mount({ report: null });
    const exit = native.animations.at(-1);
    await mount({ report: { ...report, id: 'b' } });
    measure();
    act(() => exit.complete({ finished: true }));
    expect(container.querySelector('[aria-label="Back to map"]')).not.toBeNull();
    expect(exit.stop).toHaveBeenCalled();
  });

  it('reverses a partly closed card from its current position when reopened', async () => {
    await mount();
    measure();
    native.autoFinish = false;
    await mount({ report: null });
    const exit = native.animations.at(-1);
    exit.value.setValue(120); // native slide is partway down
    await mount();
    const reopened = native.animations.at(-1);
    expect(exit.stop).toHaveBeenCalled();
    expect(reopened.config.toValue).toBe(0);
    expect(reopened.value.value).toBe(120);
  });

  it('honors reduced motion for both entry and exit', async () => {
    native.reduced = true;
    await mount();
    measure();
    await mount({ report: null });
    expect(native.timings).toHaveLength(2);
    expect(native.timings.every(config => config.duration === 0)).toBe(true);
    expect(container.querySelector('[aria-label="Back to map"]')).toBeNull();
  });
});
