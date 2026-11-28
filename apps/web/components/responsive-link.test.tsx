// @vitest-environment jsdom
import type { ComponentProps } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ResponsiveLink } from './responsive-link';

const state = vi.hoisted(() => ({ pending: false }));
vi.mock('next/link', () => ({
  useLinkStatus: () => state,
  default: ({ prefetch, children, ...props }: ComponentProps<'a'> & { prefetch?: boolean | null }) => <a {...props} data-prefetch={prefetch === undefined ? 'auto' : String(prefetch)}>{children}</a>,
}));
afterEach(() => { cleanup(); state.pending = false; });

it('keeps the destination, children and label intact throughout a slow navigation', () => {
  const view = render(<ResponsiveLink href="/report"><svg data-testid="icon" /><span>Report trash</span></ResponsiveLink>);
  const link = screen.getByRole('link', { name: 'Report trash' });
  expect(link.getAttribute('href')).toBe('/report');
  expect(screen.getByTestId('icon').parentElement).toBe(link);
  state.pending = true;
  view.rerender(<ResponsiveLink href="/report"><svg data-testid="icon" /><span>Report trash</span></ResponsiveLink>);
  expect(link.querySelector('[data-pending][aria-busy=true]')).toBeTruthy();
  expect(link.textContent).toBe('Report trash');
  expect(screen.queryByText(/Opening|Loading|Saving/)).toBeNull();
  state.pending = false;
  view.rerender(<ResponsiveLink href="/report">Report trash</ResponsiveLink>);
  expect(link.querySelector('[data-pending]')).toBeNull();
});

it.each(['mouseEnter', 'focus', 'touchStart'] as const)('warms only the chosen report on %s', event => {
  render(<><ResponsiveLink href="/reports/one" prefetch={false}>First report</ResponsiveLink><ResponsiveLink href="/reports/two" prefetch={false}>Second report</ResponsiveLink></>);
  const first = screen.getByRole('link', { name: 'First report' });
  const second = screen.getByRole('link', { name: 'Second report' });
  expect(first.getAttribute('data-prefetch')).toBe('false');
  fireEvent[event](first);
  expect(first.getAttribute('data-prefetch')).toBe('true');
  expect(second.getAttribute('data-prefetch')).toBe('false');
});

it('preserves caller handlers and honors cancelled intent events', () => {
  const focus = vi.fn(event => event.preventDefault());
  const click = vi.fn(event => event.preventDefault());
  render(<ResponsiveLink href="/map" prefetch={false} onFocus={focus} onClick={click}>Open map</ResponsiveLink>);
  const link = screen.getByRole('link', { name: 'Open map' });
  fireEvent.focus(link);
  expect(focus).toHaveBeenCalledOnce();
  expect(link.getAttribute('data-prefetch')).toBe('false');
  fireEvent.click(link, { ctrlKey: true });
  expect(click).toHaveBeenCalledOnce();
  expect(link.getAttribute('href')).toBe('/map');
});
