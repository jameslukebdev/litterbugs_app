// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { notifyDataChanged, useDataRefresh } from './use-data-refresh';
beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('refreshes visible screens on schedule and immediately after reconnect or focus', () => {
  const { result } = renderHook(() => useDataRefresh());
  act(() => vi.advanceTimersByTime(30_000));
  expect(result.current).toBe(1);
  act(() => { vi.advanceTimersByTime(1000); window.dispatchEvent(new Event('online')); });
  expect(result.current).toBe(2);
  act(() => { vi.advanceTimersByTime(1000); window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
  expect(result.current).toBe(3);
});
it('suspends polling in the background and catches up when visible again', () => {
  const { result, unmount } = renderHook(() => useDataRefresh(5000));
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  act(() => { vi.advanceTimersByTime(60_000); notifyDataChanged(); });
  expect(result.current).toBe(0);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(result.current).toBe(1);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it('shares refresh work across a large list and releases the clock after the last subscriber', () => {
  const subscribers = Array.from({ length: 100 }, () => renderHook(() => useDataRefresh(31000)));
  expect(vi.getTimerCount()).toBe(1);
  act(() => vi.advanceTimersByTime(31000));
  expect(subscribers.every(item => item.result.current === 1)).toBe(true);
  subscribers.slice(0, 99).forEach(item => item.unmount());
  expect(vi.getTimerCount()).toBe(1);
  subscribers[99].unmount(); expect(vi.getTimerCount()).toBe(0);
});
