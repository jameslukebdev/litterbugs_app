// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NotificationInbox } from './notification-inbox';
const mocks = vi.hoisted(() => ({ load: vi.fn(), acknowledge: vi.fn(), revision: 0 }));
vi.mock('@/lib/use-data-refresh', () => ({ useDataRefresh: () => mocks.revision, notifyDataChanged: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({
  rpc: mocks.acknowledge,
  from: () => { const chain = { select: () => chain, eq: () => chain, order: () => chain, range: mocks.load }; return chain; },
}) }));
const notice = (id: string, title = 'Creek cleanup') => ({ id, report_id: 'report', event_type: 'changes_requested', read_at: null, created_at: '2026-10-01T12:00:00Z', report: { title } });
beforeEach(() => { mocks.revision = 0; mocks.load.mockResolvedValue({ data: [notice('one')], error: null }); });
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it('retries the exact failed acknowledgement even after newer updates arrive', async () => {
  mocks.acknowledge.mockResolvedValueOnce({ error: new Error('network') }).mockResolvedValue({ error: null });
  render(<NotificationInbox userId="owner" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Mark read' }));
  await screen.findByRole('button', { name: 'Retry marking read' });
  mocks.load.mockResolvedValue({ data: [notice('one'), notice('two', 'Park cleanup')], error: null });
  fireEvent.click(screen.getByRole('button', { name: 'Retry marking read' }));
  await screen.findByText('Park cleanup');
  expect(mocks.acknowledge.mock.calls).toEqual([
    ['acknowledge_cleanup_notifications', { target_notification_ids: ['one'] }],
    ['acknowledge_cleanup_notifications', { target_notification_ids: ['one'] }],
  ]);
  expect(screen.queryByRole('button', { name: 'Retry marking read' })).toBeNull();
});
it('keeps acknowledgement errors separate from successful list refreshes', async () => {
  mocks.acknowledge.mockRejectedValue(new Error('offline'));
  const view = render(<NotificationInbox userId="owner" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Mark read' }));
  await screen.findByRole('button', { name: 'Retry marking read' });
  mocks.revision++;
  view.rerender(<NotificationInbox userId="owner" />);
  await waitFor(() => expect(mocks.load.mock.calls.length).toBeGreaterThan(1));
  expect(screen.getByRole('button', { name: 'Retry marking read' })).toBeTruthy();
});
it('does not let an older fetch restore unread status after acknowledgement', async () => {
  mocks.acknowledge.mockResolvedValue({ error: null });
  const view = render(<NotificationInbox userId="owner" />);
  await screen.findByText('Creek cleanup');
  let finish!: (value: unknown) => void;
  mocks.load.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  mocks.revision++; view.rerender(<NotificationInbox userId="owner" />);
  mocks.load.mockResolvedValue({ data: [{ ...notice('one'), read_at: '2026-10-01' }], error: null });
  fireEvent.click(screen.getByRole('button', { name: 'Mark read' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Mark read' })).toBeNull());
  finish({ data: [notice('one')], error: null });
  await waitFor(() => expect(screen.queryByText('Unread')).toBeNull());
});
it('clears old notices and pending retry IDs when the account changes', async () => {
  mocks.acknowledge.mockRejectedValue(new Error('offline'));
  const view = render(<NotificationInbox userId="owner" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Mark read' }));
  await screen.findByRole('button', { name: 'Retry marking read' });
  mocks.load.mockResolvedValue({ data: [], error: null });
  view.rerender(<NotificationInbox userId="other" />);
  expect(screen.queryByText('Creek cleanup')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Retry marking read' })).toBeNull();
  await screen.findByText('No updates yet. Cleanup activity will appear here.');
});
it('retains updates on refresh failure and provides an accurate reload action', async () => {
  const view = render(<NotificationInbox userId="owner" />);
  await screen.findByText('Creek cleanup');
  mocks.load.mockRejectedValue(new Error('offline')); mocks.revision++;
  view.rerender(<NotificationInbox userId="owner" />);
  await screen.findByRole('button', { name: 'Retry updates' });
  expect(screen.getByText('Creek cleanup')).toBeTruthy();
  mocks.load.mockResolvedValue({ data: [{ ...notice('one'), report: null }], error: null });
  fireEvent.click(screen.getByRole('button', { name: 'Retry updates' }));
  await screen.findByText('Report details unavailable');
  expect(mocks.acknowledge).not.toHaveBeenCalled();
});
