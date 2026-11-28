// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ModalShell } from './modal-shell';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
function mobile(reduced = false) {
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ matches: query.includes('max-width') || reduced })));
}

it('keeps the modal and scroll lock until its mobile exit completes, dismissing once', () => {
  mobile(); vi.useFakeTimers();
  const close = vi.fn();
  render(<ModalShell label="Test sheet" onClose={close}><p>Sheet content</p></ModalShell>);
  const button = screen.getByRole('button', { name: 'Close' });
  fireEvent.click(button);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(close).not.toHaveBeenCalled();
  expect(document.body.style.overflow).toBe('hidden');
  expect(screen.getByRole('dialog').parentElement?.getAttribute('data-closing')).toBe('true');
  act(() => vi.advanceTimersByTime(200));
  expect(close).toHaveBeenCalledTimes(1);
  act(() => vi.advanceTimersByTime(300));
  expect(close).toHaveBeenCalledTimes(1);
});

it('provides an exit fallback and cancels it if a route unmounts the sheet', () => {
  mobile(); vi.useFakeTimers();
  const close = vi.fn();
  const { unmount } = render(<ModalShell label="Test" onClose={close}>{dismiss => <button onClick={dismiss}>Cancel</button>}</ModalShell>);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  act(() => vi.advanceTimersByTime(200));
  expect(close).toHaveBeenCalledTimes(1);
  unmount();
  const otherClose = vi.fn();
  const other = render(<ModalShell label="Next" onClose={otherClose}>Next sheet</ModalShell>);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  other.unmount();
  act(() => vi.advanceTimersByTime(300));
  expect(otherClose).not.toHaveBeenCalled();
  expect(document.body.style.overflow).toBe('');
});

it('dismisses immediately for reduced motion and respects a disabled close', () => {
  mobile(true);
  const close = vi.fn();
  const { rerender } = render(<ModalShell label="Test" onClose={close} closeDisabled>Busy</ModalShell>);
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(close).not.toHaveBeenCalled();
  rerender(<ModalShell label="Test" onClose={close}>Ready</ModalShell>);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(close).toHaveBeenCalledTimes(1);
});
