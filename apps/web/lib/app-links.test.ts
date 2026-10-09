// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_STORE_URL, GOOGLE_PLAY_URL, appDownloadPath, beginAppHandoff, reportAppUrl, storeUrlForUserAgent } from './app-links';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('app invitation handoff', () => {
  it('supports iPad desktop mode while leaving desktop users on the download page', () => {
    expect(storeUrlForUserAgent('Macintosh', 5)).toBe(APP_STORE_URL);
    expect(storeUrlForUserAgent('Macintosh', 0)).toBeNull();
    expect(storeUrlForUserAgent('Linux Android')).toBe(GOOGLE_PLAY_URL);
    expect(appDownloadPath('report id/1')).toBe('/get-app?report=report%20id%2F1');
    expect(reportAppUrl()).toBe('litterbugs://');
  });

  it('opens the selected report first and falls back to the store when the page stays visible', () => {
    vi.useFakeTimers(); vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const navigate = vi.fn();
    beginAppHandoff(reportAppUrl('selected-report'), APP_STORE_URL, navigate);
    expect(navigate.mock.calls).toEqual([['litterbugs://reports/selected-report']]);
    vi.advanceTimersByTime(1800);
    expect(navigate.mock.calls).toEqual([['litterbugs://reports/selected-report'], [APP_STORE_URL]]);
  });

  it('does not send someone to the store after the app has opened and they return to the website', () => {
    vi.useFakeTimers(); const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const navigate = vi.fn(); beginAppHandoff(reportAppUrl(), APP_STORE_URL, navigate);
    document.dispatchEvent(new Event('visibilitychange'));
    hidden.mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange'));
    hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(5000);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('cancels pending fallback on page navigation or component disposal', () => {
    vi.useFakeTimers(); vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const navigate = vi.fn(); beginAppHandoff(reportAppUrl(), APP_STORE_URL, navigate);
    window.dispatchEvent(new Event('pagehide'));
    const cancel = beginAppHandoff(reportAppUrl('another'), APP_STORE_URL, navigate); cancel();
    vi.advanceTimersByTime(5000);
    expect(navigate).toHaveBeenCalledTimes(2);
  });
});
