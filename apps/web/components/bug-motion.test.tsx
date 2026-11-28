// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { clearFundBeforeCheckout, peekFundBeforeCheckout, rememberFundBeforeCheckout, scurryFrom, flyBug } from '@/lib/bug-motion';
import { celebratePostedPin, landPin, renderPinGlyph } from '@/lib/map-marker-glyph';
import { EmptyBug, useBecame } from './bug-motion';

afterEach(() => { cleanup(); window.sessionStorage.clear(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it('remembers the fund from before checkout only for a bigger fund on the same report, until cleared', () => {
  rememberFundBeforeCheckout('report-1', 300);
  expect(peekFundBeforeCheckout('report-2', 500)).toBeNull();
  expect(peekFundBeforeCheckout('report-1', 300)).toBeNull();
  expect(peekFundBeforeCheckout('report-1', 500)).toBe(300);
  expect(peekFundBeforeCheckout('report-1', 500)).toBe(300);
  clearFundBeforeCheckout('report-2');
  expect(peekFundBeforeCheckout('report-1', 500)).toBe(300);
  clearFundBeforeCheckout('report-1');
  expect(peekFundBeforeCheckout('report-1', 500)).toBeNull();
});

function Status({ id, state }: { id: string; state: string }) {
  const count = useBecame(id, state, (next, previous) => next === 'completed' && previous !== 'completed');
  return <span data-testid="status">{count}</span>;
}

it('counts a report becoming complete while it is open, but not opening a finished one', () => {
  const { rerender } = render(<Status id="a" state="available" />);
  expect(screen.getByTestId('status').textContent).toBe('0');
  rerender(<Status id="a" state="completed" />);
  expect(screen.getByTestId('status').textContent).toBe('1');
  rerender(<Status id="b" state="completed" />);
  expect(screen.getByTestId('status').textContent).toBe('1');
});

it('never leaves bugs behind or fails where animation is unavailable', () => {
  const button = document.createElement('button');
  document.body.append(button);
  let arrived = false;
  scurryFrom(button);
  flyBug('/brand/bugs/bee.png', button, button, () => { arrived = true; });
  expect(arrived).toBe(true);
  expect(document.querySelectorAll('img.bug-flight')).toHaveLength(0);
  render(<EmptyBug />);
  expect(document.querySelector('.bug-empty-walker')?.getAttribute('aria-hidden')).toBe('true');
});

it('stages the map entrance, blooms on a status change and removes the posted pin effects', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.useFakeTimers();
  const open = document.createElement('span');
  const completed = document.createElement('span');
  renderPinGlyph(open, 'open', 'Available', false);
  renderPinGlyph(completed, 'done', 'Done', false);
  landPin(open, 0);
  landPin(completed, 1);
  expect(open.style.animationDelay).toBe('0ms');
  expect(completed.style.animationDelay).toBe('60ms');
  expect(completed.querySelector('.bug-pin-bloom')).toBeNull();
  renderPinGlyph(open, 'done', 'Done', false);
  expect(open.querySelector('.bug-pin-bloom')).not.toBeNull();

  celebratePostedPin(completed);
  expect(completed.classList.contains('bug-pin-posted')).toBe(true);
  expect(completed.querySelector('.bug-pin-dragonfly')).not.toBeNull();
  vi.advanceTimersByTime(2200);
  expect(completed.classList.contains('bug-pin-posted')).toBe(false);
  expect(completed.querySelector('.bug-pin-dragonfly, .bug-pin-ripple')).toBeNull();
  landPin(completed, 0);
  expect(completed.classList.contains('bug-pin-land')).toBe(false);
});
