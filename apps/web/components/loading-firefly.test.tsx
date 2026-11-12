// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { LoadingFirefly } from './loading-firefly';

afterEach(() => { cleanup(); vi.useRealTimers(); });

it('never reveals the bug for a fast response, including on initial mount', () => {
  vi.useFakeTimers();
  const view = render(<LoadingFirefly active />);
  const loader = screen.getByRole('status', { name: 'Loading reports' });
  expect(loader.getAttribute('data-visible')).toBeNull();
  act(() => vi.advanceTimersByTime(150));
  view.rerender(<LoadingFirefly active={false} />);
  act(() => vi.advanceTimersByTime(1000));
  expect(loader.getAttribute('data-visible')).toBeNull();
  expect(loader.isConnected).toBe(true);
  expect(screen.queryByRole('status')).toBeNull();
});

it('reveals after the delay and retains the same element for a fade out', () => {
  vi.useFakeTimers();
  const view = render(<LoadingFirefly active />);
  const loader = screen.getByRole('status');
  act(() => vi.advanceTimersByTime(349));
  expect(loader.getAttribute('data-visible')).toBeNull();
  act(() => vi.advanceTimersByTime(1));
  expect(loader.getAttribute('data-visible')).toBe('true');
  expect(loader.querySelector('img')?.getAttribute('src')).toBe('/brand/ranks/lightning-bug.svg');
  view.rerender(<LoadingFirefly active={false} />);
  expect(loader.getAttribute('data-visible')).toBeNull();
  expect(loader.isConnected).toBe(true);
  expect(loader.getAttribute('aria-hidden')).toBe('true');
});

it('starts a new delay for a rapid retry after a visible loader', () => {
  vi.useFakeTimers();
  const view = render(<LoadingFirefly active />);
  act(() => vi.advanceTimersByTime(350));
  view.rerender(<LoadingFirefly active={false} />);
  view.rerender(<LoadingFirefly active />);
  const loader = screen.getByRole('status');
  expect(loader.getAttribute('data-visible')).toBeNull();
  act(() => vi.advanceTimersByTime(349));
  expect(loader.getAttribute('data-visible')).toBeNull();
  act(() => vi.advanceTimersByTime(1));
  expect(loader.getAttribute('data-visible')).toBe('true');
});

it('cancels pending work when leaving the loading screen', () => {
  vi.useFakeTimers();
  const view = render(<LoadingFirefly active />);
  expect(vi.getTimerCount()).toBe(1);
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
