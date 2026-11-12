// @vitest-environment jsdom
/* eslint-disable @next/next/no-html-link-for-pages -- Isolated hook test; the real Next Link context is mocked. */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PendingLinkContent } from './pending-link-content';
const state = vi.hoisted(() => ({ pending: false }));
vi.mock('next/link', () => ({ useLinkStatus: () => state }));
afterEach(cleanup);
it('acknowledges navigation and restores the link after pending is cleared', () => {
  state.pending = false;
  const view = render(<a href="/reports/example"><PendingLinkContent>See this cleanup</PendingLinkContent></a>);
  expect(screen.getByRole('link', { name: 'See this cleanup' }).getAttribute('href')).toBe('/reports/example');
  state.pending = true;
  view.rerender(<a href="/reports/example"><PendingLinkContent>See this cleanup</PendingLinkContent></a>);
  expect(screen.getByRole('link', { name: 'See this cleanup' })).toBeTruthy();
  expect(screen.getByText('See this cleanup').getAttribute('aria-busy')).toBe('true');
  expect(screen.queryByText(/Opening/)).toBeNull();
  expect(screen.getByRole('link').getAttribute('href')).toBe('/reports/example');
  state.pending = false;
  view.rerender(<a href="/reports/example"><PendingLinkContent>See this cleanup</PendingLinkContent></a>);
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.getByText('See this cleanup').hasAttribute('data-pending')).toBe(false);
  expect(screen.getByRole('link', { name: 'See this cleanup' })).toBeTruthy();
});
