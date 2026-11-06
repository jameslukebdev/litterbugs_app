// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element -- The test mock intentionally renders a native image. */
import { act, createEvent, cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicSiteHeader } from './public-site-header';
import { setHeaderProfile } from '@/lib/header-profile-cache';

const places = vi.hoisted(() => ({ search: vi.fn(), resolve: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: places.push }) }));
vi.mock('next/image', () => ({ default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));
vi.mock('@/components/public-account-action', () => ({ PublicAccountAction: () => <button>Sign in</button> }));
vi.mock('@/lib/env', () => ({ getGoogleMapsKey: () => '' }));
vi.mock('@/lib/place-search', () => ({ searchPlaces: places.search, resolvePlace: places.resolve }));
beforeEach(() => {
  places.search.mockResolvedValue([{ id: 'test-place', label: 'Boone, NC', latitude: 36.2, longitude: -81.6 }]);
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); this.querySelector('button')?.focus(); } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); this.dispatchEvent(new Event('close')); } });
});
afterEach(() => { cleanup(); setHeaderProfile(null); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('PublicSiteHeader', () => {
  it('provides one direct report action and keeps every existing destination under the new categories', () => {
    render(<PublicSiteHeader activePath="/report-litter" />);
    const main = within(screen.getByRole('navigation', { name: 'Main navigation' }));
    expect(main.getByRole('link', { name: 'Open map' }).getAttribute('href')).toBe('/map');
    fireEvent.click(main.getByRole('button', { name: 'Report' }));
    expect(main.getByRole('link', { name: 'Report trash' }).getAttribute('href')).toBe('/sign-in?next=%2Freport&view=map');
    expect(main.getByRole('link', { name: 'Reporter reward details' }).getAttribute('href')).toBe('/report-litter');
    fireEvent.click(main.getByRole('button', { name: 'Donate' }));
    expect(screen.getByRole('link', { name: 'Fees, rewards & refunds' }).getAttribute('href')).toBe('/fund-a-cleanup');
    expect(screen.getByRole('link', { name: 'Choose a report to fund' }).getAttribute('href')).toBe('/map?view=reports&browse=1&status=available');
    fireEvent.click(main.getByRole('button', { name: 'Earn' }));
    expect(screen.queryByRole('link', { name: 'Fees, rewards & refunds' })).toBeNull();
    for (const [name, href] of [['Find litter to clean', '/map?view=reports&browse=1&status=available'], ['Claiming & getting paid', '/cleaner'], ['Completed cleanups', '/cleanups'], ['Communities', '/communities'], ['Safety guidelines', '/cleanup-safety']]) {
      expect(screen.getByRole('link', { name }).getAttribute('href')).toBe(href);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Support' }));
    for (const [name, href] of [['Reporting and rewards', '/report-litter'], ['Get help', '/help'], ['Safety guidelines', '/cleanup-safety'], ['About Litterbugs', '/about'], ['Support Litterbugs', '/support']]) {
      expect(screen.getByRole('link', { name }).getAttribute('href')).toBe(href);
    }
    expect(screen.getByRole('link', { name: 'Reporting and rewards' }).getAttribute('aria-current')).toBe('page');
  });

  it('preserves the custom map report action without adding a second report button', () => {
    render(<PublicSiteHeader activePath="/map" reportAction={<button>Keep location</button>} action={<button>Your profile</button>} />);
    expect(screen.getByRole('button', { name: 'Keep location' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Report litter' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Your profile' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Search your area' })).toBeNull();
  });

  it('opens the grouped mobile menu and closes it after choosing a destination', () => {
    render(<PublicSiteHeader activePath="/about" compactMobile reportId="selected-report" />);
    const trigger = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.click(trigger);
    const drawer = within(screen.getByRole('dialog', { name: 'Site menu' }));
    const mobile = within(drawer.getByRole('navigation', { name: 'Mobile navigation' }));
    fireEvent.click(mobile.getByRole('button', { name: 'Report' }));
    expect(mobile.getByRole('link', { name: 'Report trash' }).getAttribute('href')).toBe('/sign-in?next=%2Freport&view=map');
    expect(mobile.getByRole('link', { name: 'Reporter reward details' }).getAttribute('href')).toBe('/report-litter');
    expect(mobile.queryByRole('link', { name: /Get the app|Profile|Updates/ })).toBeNull();
    expect(mobile.getByRole('link', { name: 'Open map' }).getAttribute('href')).toBe('/map');
    fireEvent.click(mobile.getByRole('button', { name: 'Support' }));
    expect(mobile.getByRole('link', { name: 'About Litterbugs' }).getAttribute('aria-current')).toBe('page');
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(mobile.getByRole('link', { name: 'About Litterbugs' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe('');
  });

  it('dismisses the mobile drawer from its close button and backdrop', () => {
    render(<PublicSiteHeader activePath="/" />);
    const trigger = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('dialog'), { clientX: 400 });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps the app download panel and store destinations', () => {
    render(<PublicSiteHeader activePath="/" />);
    const trigger = screen.getAllByRole('link', { name: 'Get the app' }).find(link => link.getAttribute('aria-expanded') !== null)!;
    fireEvent.click(trigger);
    expect(screen.getByRole('region', { name: 'Get the Litterbugs app' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'App Store' }).getAttribute('href')).toContain('id6757313862');
    expect(screen.getByRole('link', { name: 'Google Play' }).getAttribute('href')).toContain('com.litterbugs.app');
    screen.getByRole('link', { name: 'App Store' }).focus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Get the Litterbugs app' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('dismisses category menus with Escape, outside click, and focus leaving', () => {
    render(<PublicSiteHeader activePath="/cleaner" />);
    const trigger = screen.getByRole('button', { name: 'Earn' });
    fireEvent.click(trigger);
    screen.getByRole('link', { name: 'Communities' }).focus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);
    fireEvent.blur(trigger, { relatedTarget: screen.getByRole('button', { name: 'Search your area' }) });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('expands search in the header without a modal or scroll lock and suggests locations while typing', async () => {
    render(<PublicSiteHeader activePath="/" />);
    const trigger = screen.getByRole('button', { name: 'Search your area' });
    fireEvent.click(trigger);
    const region = screen.getByRole('region', { name: 'Search your area' });
    const input = within(region).getByRole('combobox');
    expect(document.activeElement).toBe(input);
    expect(region.closest('header')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    fireEvent.change(input, { target: { value: 'Boo' } });
    expect(await screen.findByRole('option', { name: /Boone, NC/ })).toBeTruthy();
    expect(places.search).toHaveBeenCalledWith('Boo', expect.any(Object));
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('option')).toBeNull();
    expect(screen.getByRole('region', { name: 'Search your area' })).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Search your area' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes search when opening navigation and closes navigation when opening search', () => {
    render(<PublicSiteHeader activePath="/" />);
    const search = screen.getByRole('button', { name: 'Search your area' });
    const help = screen.getByRole('button', { name: 'Support' });
    fireEvent.click(help);
    fireEvent.click(search);
    expect(help.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(help);
    expect(search.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(search);
    fireEvent.click(screen.getByRole('button', { name: 'Close area search' }));
    expect(document.activeElement).toBe(search);
    fireEvent.click(search);
    fireEvent.pointerDown(document.body);
    expect(search.getAttribute('aria-expanded')).toBe('false');
  });
});


function pointer(target: HTMLElement, kind: 'pointerOver' | 'pointerOut', pointerType = 'mouse') {
  const event = createEvent[kind](target, { bubbles: true });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  fireEvent(target, event);
}
function enableDesktopHover() {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
}
it('ignores passing pointers, opens after intent, and tolerates crossing into the panel', () => {
  enableDesktopHover();
  render(<PublicSiteHeader activePath="/" />);
  const trigger = screen.getByRole('button', { name: 'Report' });
  const root = trigger.parentElement!;
  pointer(root, 'pointerOver');
  act(() => vi.advanceTimersByTime(200));
  pointer(root, 'pointerOut');
  act(() => vi.advanceTimersByTime(400));
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  pointer(root, 'pointerOver');
  act(() => vi.advanceTimersByTime(349));
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  act(() => vi.advanceTimersByTime(1));
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  pointer(root, 'pointerOut');
  act(() => vi.advanceTimersByTime(200));
  pointer(root, 'pointerOver');
  act(() => vi.advanceTimersByTime(400));
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  pointer(root, 'pointerOut');
  act(() => vi.advanceTimersByTime(300));
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
});
it('does not let an old close timer dismiss another menu, or reopen after Escape', () => {
  enableDesktopHover();
  render(<PublicSiteHeader activePath="/" />);
  const report = screen.getByRole('button', { name: 'Report' });
  const donate = screen.getByRole('button', { name: 'Donate' });
  pointer(report.parentElement!, 'pointerOver');
  act(() => vi.advanceTimersByTime(350));
  pointer(report.parentElement!, 'pointerOut');
  fireEvent.click(donate);
  act(() => vi.advanceTimersByTime(500));
  expect(donate.getAttribute('aria-expanded')).toBe('true');
  fireEvent.keyDown(donate, { key: 'Escape' });
  pointer(report.parentElement!, 'pointerOver');
  fireEvent.keyDown(report, { key: 'Escape' });
  act(() => vi.advanceTimersByTime(500));
  expect(report.getAttribute('aria-expanded')).toBe('false');
});
it('keeps touch activation immediate and preserves a keyboard-focused submenu', () => {
  enableDesktopHover();
  render(<PublicSiteHeader activePath="/" />);
  const trigger = screen.getByRole('button', { name: 'Report' });
  pointer(trigger.parentElement!, 'pointerOver', 'touch');
  act(() => vi.advanceTimersByTime(500));
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  screen.getByRole('link', { name: 'Reporter reward details' }).focus();
  pointer(trigger.parentElement!, 'pointerOut');
  act(() => vi.advanceTimersByTime(500));
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
});

// Map reporting lives in the map canvas; the site header keeps its Report menu.
it('uses the same Report menu in map navigation without a Report litter label', () => {
  render(<PublicSiteHeader activePath="/map" />);
  const main = within(screen.getByRole('navigation', { name: 'Main navigation' }));
  expect(main.queryByRole('link', { name: 'Report litter' })).toBeNull();
  fireEvent.click(main.getByRole('button', { name: /^Report$/ }));
  expect(main.getByRole('link', { name: 'Report trash' }).getAttribute('href')).toBe('/sign-in?next=%2Freport&view=map');
});


it('keeps a hover-open menu open on the first click and allows an explicit second click to close', () => {
  enableDesktopHover();
  render(<PublicSiteHeader activePath="/" />);
  const report = screen.getByRole('button', { name: 'Report' });
  pointer(report.parentElement!, 'pointerOver');
  act(() => vi.advanceTimersByTime(350));
  fireEvent.click(report);
  expect(report.getAttribute('aria-expanded')).toBe('true');
  expect(screen.getByRole('link', { name: 'Report trash' })).toBeTruthy();
  fireEvent.click(report);
  expect(report.getAttribute('aria-expanded')).toBe('false');
});

it('opens a selected search location through client navigation with its coordinates intact', async () => {
  places.resolve.mockResolvedValue({ id: 'boone', label: 'Boone, NC', latitude: 36.2, longitude: -81.6 });
  render(<PublicSiteHeader activePath="/" />);
  fireEvent.click(screen.getByRole('button', { name: 'Search your area' }));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Boo' } });
  fireEvent.click(await screen.findByRole('option', { name: /Boone, NC/ }));
  await waitFor(() => expect(places.push).toHaveBeenCalledWith('/map?view=map&browse=1&area=boone&lat=36.2&lng=-81.6&zoom=12'));
  expect(screen.queryByRole('region', { name: 'Search your area' })).toBeNull();
});

it('offers a direct login destination in the homepage mobile menu', () => {
  render(<PublicSiteHeader activePath="/" />);
  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
  const menu = screen.getByRole('dialog', { name: 'Site menu' });
  const login = within(menu).getByRole('link', { name: 'Log in / Sign up' });
  expect(login.getAttribute('href')).toBe('/sign-in');
  fireEvent.click(login);
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('uses the same mobile menu destinations on the map and public pages', () => {
  function readMenu(activePath: '/' | '/map' | '/about') {
    const view = render(<PublicSiteHeader activePath={activePath} compactMobile={activePath === '/map'} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const menu = within(screen.getByRole('navigation', { name: 'Mobile navigation' }));
    expect(menu.queryByText(/Updates|Profile|Get the app/)).toBeNull();
    const result: string[] = menu.getAllByRole('link').map(link => `${link.textContent}:${link.getAttribute('href')}`);
    for (const name of ['Report', 'Donate', 'Earn', 'Support']) {
      fireEvent.click(menu.getByRole('button', { name }));
      result.push(...menu.getAllByRole('link').map(link => `${link.textContent}:${link.getAttribute('href')}`));
    }
    view.unmount();
    return result;
  }
  const home = readMenu('/');
  expect(readMenu('/map')).toEqual(home);
  expect(readMenu('/about')).toEqual(home);
});

it('omits login and duplicate account links for signed-in members', () => {
  setHeaderProfile({ userId: 'member-id', email: 'member@example.com', profile: null });
  render(<PublicSiteHeader activePath="/map" compactMobile />);
  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
  const menu = within(screen.getByRole('navigation', { name: 'Mobile navigation' }));
  expect(menu.queryByRole('link', { name: /Log in|Profile|Updates|Get the app/ })).toBeNull();
});

it.each(['/', '/map'] as const)('keeps the outlined Open map entry with its icon on %s', (activePath) => {
  render(<PublicSiteHeader activePath={activePath} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
  const menu = within(screen.getByRole('navigation', { name: 'Mobile navigation' }));
  const map = menu.getByRole('link', { name: 'Open map' });
  expect(map.getAttribute('href')).toBe('/map');
  expect(map.querySelector('svg')).toBeTruthy();
  expect(map.getAttribute('aria-current')).toBe(activePath === '/map' ? 'page' : null);
  expect(menu.getByRole('link', { name: 'Log in / Sign up' }).getAttribute('href')).toBe('/sign-in');
});
