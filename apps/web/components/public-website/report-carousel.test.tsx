// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ReportCarousel } from './report-carousel';
vi.mock('../header-area-search', () => ({ HeaderAreaSearch: () => null }));
vi.mock('../photo-batch', () => ({ usePhotoBatch: () => {}, photoBatchClass: '', PhotoBatchFallback: () => null }));
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function setup() {
  render(<ReportCarousel enabled className="cards">{[1, 2, 3, 4].map(n => <article key={n}>Report {n}</article>)}</ReportCarousel>);
  const track = screen.getByLabelText('Report cards; scroll to see more');
  Object.defineProperties(track, { scrollWidth: { value: 1200 }, clientWidth: { value: 300 }, scrollLeft: { value: 0, writable: true } });
  vi.spyOn(track.firstElementChild!, 'getBoundingClientRect').mockReturnValue({ width: 278 } as DOMRect);
  track.scrollTo = vi.fn();
  fireEvent.scroll(track);
  return track;
}
it('honors rapid clicks while the prior smooth scroll is still in flight, and clamps at the end', () => {
  const track = setup();
  const next = screen.getByRole('button', { name: 'Next reports' });
  fireEvent.click(next); fireEvent.click(next); fireEvent.click(next); fireEvent.click(next);
  expect(vi.mocked(track.scrollTo).mock.calls.map(([options]) => (options as ScrollToOptions).left)).toEqual([300, 600, 900, 900]);
});
it('resets to the actual position after a manual scroll or a completed animation', () => {
  const track = setup(); const next = screen.getByRole('button', { name: 'Next reports' });
  fireEvent.click(next);
  track.scrollLeft = 100; fireEvent.wheel(track); fireEvent.click(next);
  expect(track.scrollTo).toHaveBeenLastCalledWith({ left: 400, behavior: 'smooth' });
  track.scrollLeft = 400; fireEvent(track, new Event('scrollend')); fireEvent.click(next);
  expect(track.scrollTo).toHaveBeenLastCalledWith({ left: 700, behavior: 'smooth' });
});
it('honors reduced motion', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const track = setup(); fireEvent.click(screen.getByRole('button', { name: 'Next reports' }));
  expect(track.scrollTo).toHaveBeenLastCalledWith({ left: 300, behavior: 'instant' });
});
