import { afterEach, expect, it, vi } from 'vitest';
import { deviceSaveStatus, forgetOtherDeviceSaves, forgetDeviceSave, retryDeviceSaves, trackDeviceSave } from './device-save-state';
afterEach(() => forgetOtherDeviceSaves(null));
it('keeps an in-flight device write visible until the transaction completes', async () => {
  let finish!: () => void;
  const pending = trackDeviceSave('owner', 'report', () => new Promise<void>(resolve => { finish = resolve; }));
  expect(deviceSaveStatus()).toEqual({ pending: true, failed: false });
  finish(); await pending;
  expect(deviceSaveStatus()).toEqual({ pending: false, failed: false });
});
it('retains a failed write for explicit retry after the editor has gone away', async () => {
  const write = vi.fn().mockRejectedValueOnce(new Error('quota')).mockResolvedValueOnce(undefined);
  await expect(trackDeviceSave('owner', 'report', write)).rejects.toThrow('quota');
  expect(deviceSaveStatus('owner').failed).toBe(true);
  await retryDeviceSaves();
  expect(write).toHaveBeenCalledTimes(2);
  expect(deviceSaveStatus('owner').failed).toBe(false);
});
it('does not let an older write failure overwrite a newer successful save', async () => {
  let fail!: (error: Error) => void;
  const old = trackDeviceSave('owner', 'report', () => new Promise((_resolve, reject) => { fail = reject; })).catch(() => {});
  await trackDeviceSave('owner', 'report', async () => undefined);
  fail(new Error('old failure')); await old;
  expect(deviceSaveStatus()).toEqual({ pending: false, failed: false });
});
it('cannot retry discarded or signed-out account data', async () => {
  const write = vi.fn().mockRejectedValue(new Error('offline'));
  await trackDeviceSave('owner', 'report', write).catch(() => {});
  forgetDeviceSave('owner', 'report'); await retryDeviceSaves();
  expect(write).toHaveBeenCalledTimes(1);
  await trackDeviceSave('owner', 'report', write).catch(() => {});
  forgetOtherDeviceSaves('other'); await retryDeviceSaves();
  expect(write).toHaveBeenCalledTimes(2);
});
