// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useCleanupAttempt } from './use-cleanup-attempt';
const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => {
  const chain = { from: () => chain, select: () => chain, eq: () => chain, in: () => chain, order: () => chain, limit: () => chain, maybeSingle: read };
  return chain;
} }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it('ignores older responses and confirmed mutations invalidate pending reads', async () => {
  const pending: ((result: unknown) => void)[] = [];
  read.mockImplementation(() => new Promise(resolve => pending.push(resolve)));
  const { result } = renderHook(() => useCleanupAttempt('report', 'owner', false, 0, 'claimed'));
  await waitFor(() => expect(pending).toHaveLength(1));
  let retry: Promise<boolean>;
  act(() => { retry = result.current.refresh(); });
  await act(async () => { pending[1]({ data: { id: 'new' }, error: null }); await retry; });
  await act(async () => { pending[0]({ data: { id: 'old' }, error: null }); });
  expect(result.current.attempt?.id).toBe('new');
  act(() => { void result.current.refresh(); });
  act(() => result.current.clear());
  await act(async () => { pending[2]({ data: { id: 'resurrected' }, error: null }); });
  expect(result.current.attempt).toBeNull();
});

it('does not retain another account’s task after a failed identity switch', async () => {
  read.mockResolvedValueOnce({ data: { id: 'private-task' }, error: null }).mockRejectedValueOnce(new Error('offline'));
  const { result, rerender } = renderHook(({ owner }) => useCleanupAttempt('report', owner, true, 0, 'completion_submitted'), { initialProps: { owner: 'first' } });
  await waitFor(() => expect(result.current.attempt?.id).toBe('private-task'));
  rerender({ owner: 'second' });
  expect(result.current.attempt).toBeNull();
  await waitFor(() => expect(result.current.failed).toBe(true));
  expect(result.current.attempt).toBeNull();
});

it('keeps the last confirmation time on error and accepts a successful empty result', async () => {
  read.mockResolvedValueOnce({ data: { id: 'task' }, error: null })
    .mockResolvedValueOnce({ data: null, error: new Error('offline') })
    .mockResolvedValueOnce({ data: null, error: null });
  const { result } = renderHook(() => useCleanupAttempt('report', 'owner', false, 0, 'claimed'));
  await waitFor(() => expect(result.current.attempt?.id).toBe('task'));
  const confirmed = result.current.checkedAt;
  await act(async () => { await result.current.refresh(); });
  expect(result.current.checkedAt).toBe(confirmed);
  expect(result.current.attempt?.id).toBe('task');
  expect(result.current.failed).toBe(true);
  await act(async () => { await result.current.refresh(); });
  expect(result.current.attempt).toBeNull();
  expect(result.current.failed).toBe(false);
});
