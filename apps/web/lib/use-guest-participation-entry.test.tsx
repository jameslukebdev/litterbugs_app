// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useGuestParticipationEntry } from './use-guest-participation-entry';

const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/website-analytics', () => ({ trackParticipation: track }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it.each(['fund', 'clean'] as const)('continues an explicit %s entry once, including strict effects and callback changes', action => {
  const onRequireSignIn = vi.fn();
  const props = { action, reportId: 'report-1', autoOpen: true, userId: null, available: true, onRequireSignIn };
  const view = renderHook(useGuestParticipationEntry, { initialProps: props, wrapper: StrictMode });
  expect(onRequireSignIn).toHaveBeenCalledTimes(1);
  expect(track).toHaveBeenCalledExactlyOnceWith(action, 'action_tapped');
  const nextCallback = vi.fn();
  view.rerender({ ...props, onRequireSignIn: nextCallback });
  expect(nextCallback).not.toHaveBeenCalled();
  expect(track).toHaveBeenCalledTimes(1);
});

it('waits for availability and an auth handler, without interrupting signed-in visitors', () => {
  const onRequireSignIn = vi.fn();
  const props = { action: 'fund' as const, reportId: 'report-1', autoOpen: true, userId: null as string | null, available: false, onRequireSignIn };
  const view = renderHook(useGuestParticipationEntry, { initialProps: props });
  expect(onRequireSignIn).not.toHaveBeenCalled();
  view.rerender({ ...props, available: true, userId: 'member' });
  expect(onRequireSignIn).not.toHaveBeenCalled();
  view.rerender({ ...props, available: true });
  expect(onRequireSignIn).toHaveBeenCalledTimes(1);
});

it('does not duplicate a manual tap when the same intent appears in the URL', () => {
  const onRequireSignIn = vi.fn();
  const props = { action: 'clean' as const, reportId: 'report-1', autoOpen: false, userId: null, available: true, onRequireSignIn };
  const view = renderHook(useGuestParticipationEntry, { initialProps: props });
  act(() => view.result.current());
  view.rerender({ ...props, autoOpen: true });
  expect(onRequireSignIn).not.toHaveBeenCalled();
  expect(track).not.toHaveBeenCalled();
  view.rerender(props);
  view.rerender({ ...props, autoOpen: true });
  expect(onRequireSignIn).toHaveBeenCalledTimes(1);
});

it('allows a different report entry after dismissal without repeatedly prompting the same report', () => {
  const onRequireSignIn = vi.fn();
  const props = { action: 'clean' as const, reportId: 'report-1', autoOpen: true, userId: null, available: true, onRequireSignIn };
  const view = renderHook(useGuestParticipationEntry, { initialProps: props });
  view.rerender({ ...props, reportId: 'report-2' });
  expect(onRequireSignIn).toHaveBeenCalledTimes(2);
});
