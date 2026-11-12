// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ReportCardOptions } from './report-card-options';
const mock = vi.hoisted(() => ({ sync: vi.fn(), set: vi.fn() }));
vi.mock('@/lib/bug-motion', () => ({ scurryFrom: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) } }) }));
vi.mock('@/lib/synced-report-preferences', () => ({ reportPreferenceSync: {
  load: async () => ({ preferences: { favorites: [], hidden: [] } }),
  set: mock.set, sync: mock.sync,
} }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('allows undo after the device save while cloud sync is still pending, without changing button text to progress data', async () => {
  let finish!: (result: { offline: boolean }) => void;
  mock.sync.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  mock.set.mockImplementation(async (_owner, _kind, reportId, enabled) => ({ preferences: { favorites: [], hidden: enabled ? [reportId] : [] } }));
  render(<ReportCardOptions reportId="report" title="Trail" />);
  await act(async () => {});
  fireEvent.click(screen.getByText('•••'));
  fireEvent.click(screen.getByRole('button', { name: 'Hide report' }));
  const undo = await screen.findByRole('button', { name: 'Unhide report' });
  expect(undo.hasAttribute('disabled')).toBe(false);
  expect(screen.queryByText(/Saving|Opening/)).toBeNull();
  fireEvent.click(undo);
  await screen.findByRole('button', { name: 'Hide report' });
  expect(mock.set.mock.calls.map(args => args[3])).toEqual([true, false]);
  await act(async () => { finish({ offline: false }); });
  expect(screen.getByRole('status').textContent).toBe('Report restored to map results.');
});
it('keeps the durable local result and explains a later offline sync', async () => {
  mock.set.mockResolvedValue({ preferences: { favorites: [], hidden: ['report'] } });
  mock.sync.mockResolvedValue({ offline: true });
  render(<ReportCardOptions reportId="report" title="Trail" />);
  await act(async () => {});
  fireEvent.click(screen.getByText('•••'));
  fireEvent.click(screen.getByRole('button', { name: 'Hide report' }));
  await screen.findByText('Saved on this device. Changes will sync when you reconnect.');
  expect(screen.getByRole('button', { name: 'Unhide report' }).hasAttribute('disabled')).toBe(false);
});
