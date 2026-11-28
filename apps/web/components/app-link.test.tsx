// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppLink, ContinueOnWebsiteLink } from './app-link';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/app-links';

const mock = vi.hoisted(() => ({ handoff: vi.fn(), cancel: vi.fn(), track: vi.fn() }));
vi.mock('@/lib/app-links', async original => ({ ...await original<object>(), beginAppHandoff: mock.handoff }));
vi.mock('@/lib/website-analytics', () => ({ trackAppChoice: mock.track }));
vi.mock('next/link', () => ({ default: function FakeLink({ onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} onClick={event => { onClick?.(event); event.preventDefault(); }} />;
} }));
beforeEach(() => { vi.clearAllMocks(); mock.handoff.mockReturnValue(mock.cancel); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it.each([['iPhone', APP_STORE_URL, 'app_store'], ['Android', GOOGLE_PLAY_URL, 'google_play']])('measures a deliberate %s app attempt and actual fallback separately', (agent, store, storeName) => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(agent);
  const view = render(<AppLink reportId="private-report">Open the app</AppLink>);
  fireEvent.click(screen.getByRole('link', { name: 'Open the app' }));
  expect(mock.track.mock.calls).toEqual([['open_requested', 'report', storeName]]);
  expect(mock.handoff).toHaveBeenCalledWith('litterbugs://reports/private-report', store, undefined, expect.any(Function));
  mock.handoff.mock.calls[0][3]();
  expect(mock.track).toHaveBeenLastCalledWith('store_fallback', 'report', storeName);
  expect(JSON.stringify(mock.track.mock.calls)).not.toContain('private-report');
  view.unmount();
  expect(mock.cancel).toHaveBeenCalledTimes(1);
});

it('measures desktop download navigation without claiming an app-open attempt', () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Desktop');
  render(<AppLink>Get the app</AppLink>);
  const link = screen.getByRole('link', { name: 'Get the app' });
  expect(link.getAttribute('href')).toBe('/get-app');
  fireEvent.click(link);
  expect(mock.track.mock.calls).toEqual([['download_page_requested', 'map']]);
  expect(mock.handoff).not.toHaveBeenCalled();
});

it.each([undefined, 'private-report'])('measures website continuation while preserving the destination (%s)', reportId => {
  render(<ContinueOnWebsiteLink reportId={reportId} className="primary-button button-link" />);
  const link = screen.getByRole('link', { name: 'Continue on the website' });
  expect(link.getAttribute('href')).toBe(reportId ? '/map?view=map&report=private-report' : '/map?view=map');
  expect(link.className).toBe('primary-button button-link');
  fireEvent.click(link);
  expect(mock.track.mock.calls).toEqual([['website_continued', reportId ? 'report' : 'map']]);
});

it('leaves modified link clicks to the browser without recording a same-tab choice', () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android');
  render(<><AppLink>Open the app</AppLink><ContinueOnWebsiteLink /></>);
  for (const link of screen.getAllByRole('link')) {
    fireEvent.click(link, { ctrlKey: true });
    fireEvent.click(link, { metaKey: true });
    fireEvent.click(link, { shiftKey: true });
  }
  expect(mock.track).not.toHaveBeenCalled();
  expect(mock.handoff).not.toHaveBeenCalled();
});
