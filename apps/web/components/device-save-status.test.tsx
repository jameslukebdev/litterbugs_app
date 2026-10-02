// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DeviceSaveStatus } from './device-save-status';
import { forgetOtherDeviceSaves, trackDeviceSave } from '@/lib/device-save-state';
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) } }) }));
afterEach(() => { cleanup(); forgetOtherDeviceSaves(null); });
const departure = () => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; };

it('protects departure while photo bytes are saving and allows departure after completion', async () => {
  render(<DeviceSaveStatus />);
  let finish!: () => void;
  let writing!: Promise<void>;
  act(() => { writing = trackDeviceSave('customer', 'report', () => new Promise<void>(resolve => { finish = resolve; })); });
  expect(screen.getByRole('status').textContent).toContain('Saving draft');
  expect(departure()).toBe(true);
  await act(async () => { finish(); await writing; });
  expect(screen.queryByRole('status')).toBeNull();
  expect(departure()).toBe(false);
});
it('keeps a failed cleanup save recoverable and clears the departure warning only after retry succeeds', async () => {
  const write = vi.fn().mockRejectedValueOnce(new Error('Storage full')).mockResolvedValueOnce(undefined);
  await trackDeviceSave('customer', 'cleanup:attempt', write).catch(() => {});
  render(<DeviceSaveStatus />);
  expect(screen.getByRole('alert').textContent).toContain('could not be saved');
  expect(departure()).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  expect(write).toHaveBeenCalledTimes(2);
  expect(departure()).toBe(false);
});
it('does not warn about unrelated cloud sync when all device writes are complete', async () => {
  await trackDeviceSave('customer', 'report', async () => undefined);
  render(<DeviceSaveStatus />);
  expect(departure()).toBe(false);
  cleanup();
  expect(departure()).toBe(false);
});
