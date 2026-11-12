// @vitest-environment jsdom
import { StrictMode, useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { MappableReport } from '@litterbugs/report-contract';
import { MapExperience } from './map-experience';

const mock = vi.hoisted(() => ({
  signals: vi.fn(), importLibrary: vi.fn(), listeners: new Map<string, () => void>(),
  markerFails: false, reports: [] as MappableReport[],
  panTo: vi.fn(), setZoom: vi.fn(), setMapType: vi.fn(),
}));
vi.mock('@/lib/website-analytics', async original => ({ ...await original<object>(), trackMapLoading: mock.signals }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@googlemaps/js-api-loader', () => ({ importLibrary: mock.importLibrary, setOptions: vi.fn() }));
vi.mock('@/lib/report-clusters', () => ({ createReportClusters: () => ({ update: vi.fn(), select: vi.fn(), dispose: vi.fn() }) }));
vi.mock('@/lib/use-data-refresh', () => ({ useDataRefresh: () => 0 }));
vi.mock('@/lib/funding', () => ({ loadCleanupFeatureFlags: async () => ({}) }));
vi.mock('@/lib/synced-report-preferences', () => ({ reportPreferenceSync: {
  load: async () => ({ preferences: { favorites: [], hidden: [] } }),
  sync: async () => ({ preferences: { favorites: [], hidden: [] } }),
} }));
vi.mock('@/components/public-site-header', () => ({ PublicSiteHeader: () => null }));
vi.mock('@/components/public-site-footer', () => ({ PublicSiteFooter: () => null }));
vi.mock('@/components/place-search', () => ({ PlaceSearch: () => null }));
vi.mock('@/components/report-browser', () => ({ ReportBrowser: function Browser({ onVisibleReportsChange }: { onVisibleReportsChange: (reports: MappableReport[]) => void }) {
  useEffect(() => { onVisibleReportsChange(mock.reports); }, [onVisibleReportsChange]);
  return null;
} }));

const props = { initialReports: [], initialUserId: null, googleMapsKey: 'test', googleMapsMapId: 'test', initialError: '' };
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.clearAllMocks(); localStorage.clear(); mock.listeners.clear(); mock.reports = []; mock.markerFails = false;
  window.history.replaceState({}, '', '/map');
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  mock.importLibrary.mockImplementation(async name => name === 'maps' ? { Map: class {
    addListener(name: string, handler: () => void) { mock.listeners.set(name, handler); }
    panTo = mock.panTo;
    setZoom = mock.setZoom;
    setMapTypeId = mock.setMapType;
  } } : { AdvancedMarkerElement: class {
    constructor() { if (mock.markerFails) throw new Error('private marker details'); }
  } });
});
afterEach(() => { cleanup(); delete window.gm_authFailure; Reflect.deleteProperty(navigator, 'geolocation'); vi.useRealTimers(); });
async function mount(missingKey = false) {
  const view = render(<StrictMode><MapExperience {...props} googleMapsKey={missingKey ? '' : props.googleMapsKey} /></StrictMode>);
  await act(async () => {});
  return view;
}

it('records one real startup in Strict Mode and first tiles once across repeated tile events', async () => {
  await mount();
  expect(mock.signals.mock.calls.map(([signal]) => signal.stage)).toEqual(['started']);
  await act(async () => { mock.listeners.get('tilesloaded')!(); mock.listeners.get('tilesloaded')!(); });
  expect(mock.signals.mock.calls.map(([signal]) => signal.stage)).toEqual(['started', 'tiles_ready']);
  expect(screen.queryByText('Map unavailable')).toBeNull();
});
it('reports missing configuration even though the map SDK never starts', async () => {
  await mount(true);
  expect(mock.importLibrary).not.toHaveBeenCalled();
  expect(mock.signals).toHaveBeenCalledWith(expect.objectContaining({ stage: 'failed', reason: 'configuration_missing' }));
  expect(screen.getByText('Map unavailable')).toBeTruthy();
});
it('reports rejected initialization independently of report data and loaded tiles', async () => {
  mock.importLibrary.mockRejectedValue(new Error('private Google URL and key'));
  await mount();
  expect(mock.signals).toHaveBeenCalledWith(expect.objectContaining({ stage: 'failed', reason: 'initialization_failed' }));
  expect(JSON.stringify(mock.signals.mock.calls)).not.toMatch(/private|Google URL|key/);
});
it('reports a startup timeout then late recovery and clears the loading error', async () => {
  await mount();
  await act(async () => { await vi.advanceTimersByTimeAsync(12000); });
  expect(mock.signals).toHaveBeenCalledWith(expect.objectContaining({ stage: 'failed', reason: 'startup_timeout' }));
  expect(screen.getByText('Map unavailable')).toBeTruthy();
  await act(async () => { mock.listeners.get('tilesloaded')!(); });
  expect(mock.signals).toHaveBeenCalledWith(expect.objectContaining({ stage: 'recovered' }));
  expect(screen.queryByText('Map unavailable')).toBeNull();
});
it('reports authorization failures once and suppresses later tile success', async () => {
  await mount();
  await act(async () => { window.gm_authFailure!(); window.gm_authFailure!(); mock.listeners.get('tilesloaded')!(); });
  expect(mock.signals.mock.calls.map(([signal]) => signal.stage)).toEqual(['started', 'failed']);
  expect(mock.signals).toHaveBeenLastCalledWith(expect.objectContaining({ reason: 'authorization_failed' }));
});
it('reports marker construction failures before result telemetry is available', async () => {
  mock.markerFails = true;
  mock.reports = [{ id: 'private-id', title: 'private title', latitude: 36, longitude: -81 } as MappableReport];
  await mount();
  expect(mock.signals).toHaveBeenCalledWith(expect.objectContaining({ stage: 'failed', reason: 'marker_render_failed' }));
  expect(JSON.stringify(mock.signals.mock.calls)).not.toMatch(/private|latitude|longitude/);
});
it('does not record a timeout after leaving the map', async () => {
  const view = await mount(); view.unmount();
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(mock.signals.mock.calls.map(([signal]) => signal.stage)).toEqual(['started']);
});

it('applies rapid map-type clicks in order without losing one to batched state updates', async () => {
  await mount();
  const layers = screen.getByRole('button', { name: 'Change map type. Current: roadmap' });
  act(() => { fireEvent.click(layers); fireEvent.click(layers); });
  expect(mock.setMapType.mock.calls.map(([kind]) => kind)).toEqual(['satellite', 'hybrid']);
  expect(screen.getByRole('button', { name: 'Change map type. Current: hybrid' })).toBeTruthy();
});
it('releases the location control after an unanswered browser request, without late map movement', async () => {
  let reply!: PositionCallback;
  const getCurrentPosition = vi.fn((success: PositionCallback) => { reply = success; });
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
  await mount();
  await act(async () => { mock.listeners.get('tilesloaded')!(); });
  const button = screen.getByRole('button', { name: 'Center map on your location' });
  act(() => { fireEvent.click(button); fireEvent.click(button); });
  expect(getCurrentPosition).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Finding your location' }).hasAttribute('disabled')).toBe(true);
  await act(async () => { await vi.advanceTimersByTimeAsync(12000); });
  expect(screen.getByRole('button', { name: 'Center map on your location' }).hasAttribute('disabled')).toBe(false);
  await act(async () => { reply({ coords: { latitude: 1, longitude: 2 } } as GeolocationPosition); });
  expect(mock.panTo).not.toHaveBeenCalled();
});
