// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => mocks }));
import { AnalyticsAutoRefresh, REFRESH_INTERVAL } from './auto-refresh';
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); mocks.refresh.mockReset(); });
describe('automatic dashboard refresh', () => {
  it('refreshes visible data without refreshing hidden tabs or resetting navigation', () => {
    vi.useFakeTimers(); let visible = true;
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible ? 'visible' : 'hidden');
    render(<AnalyticsAutoRefresh />);
    act(() => vi.advanceTimersByTime(REFRESH_INTERVAL)); expect(mocks.refresh).toHaveBeenCalledTimes(1);
    visible = false;
    act(() => vi.advanceTimersByTime(REFRESH_INTERVAL * 2)); expect(mocks.refresh).toHaveBeenCalledTimes(1);
    visible = true;
    act(() => document.dispatchEvent(new Event('visibilitychange'))); expect(mocks.refresh).toHaveBeenCalledTimes(2);
  });
  it('removes its timer when leaving the admin page', () => {
    vi.useFakeTimers(); vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const view = render(<AnalyticsAutoRefresh />); view.unmount();
    act(() => vi.advanceTimersByTime(REFRESH_INTERVAL * 2)); expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
