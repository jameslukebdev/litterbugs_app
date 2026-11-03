// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { NotificationLink } from './notification-inbox';
const mocks = vi.hoisted(() => ({ count: vi.fn(), revision: 0 }));
vi.mock('@/lib/use-data-refresh', () => ({ useDataRefresh: () => mocks.revision, notifyDataChanged: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from: () => {
  const chain = { select: () => chain, eq: () => chain, is: mocks.count }; return chain;
} }) }));
afterEach(() => { cleanup(); vi.resetAllMocks(); mocks.revision = 0; });
it('updates the bell when new unread notifications arrive and when they are read', async () => {
  mocks.count.mockResolvedValue({ count: 0, error: null });
  const view = render(<NotificationLink userId="owner" />);
  await waitFor(() => expect(mocks.count).toHaveBeenCalled());
  mocks.count.mockResolvedValue({ count: 2, error: null });
  mocks.revision++; view.rerender(<NotificationLink userId="owner" />);
  expect(await screen.findByRole('link', { name: 'Notifications, 2 unread' })).toBeTruthy();
  mocks.count.mockResolvedValue({ count: 0, error: null });
  mocks.revision++; view.rerender(<NotificationLink userId="owner" />);
  await waitFor(() => expect(screen.queryByText('2')).toBeNull());
});
it('preserves the last unread count on a failed refresh without leaking it to another account', async () => {
  mocks.count.mockResolvedValue({ count: 3, error: null });
  const view = render(<NotificationLink userId="owner" />);
  await screen.findByRole('link', { name: 'Notifications, 3 unread' });
  mocks.count.mockResolvedValue({ count: null, error: new Error('offline') });
  mocks.revision++; view.rerender(<NotificationLink userId="owner" />);
  await waitFor(() => expect(mocks.count).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('link', { name: 'Notifications, 3 unread' })).toBeTruthy();
  view.rerender(<NotificationLink userId="other" />);
  expect(screen.queryByText('3')).toBeNull();
});
