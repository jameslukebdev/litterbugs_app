// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_REPORT_DRAFT, type ReportDraft, type MappableReport } from '@litterbugs/report-contract';
import { useEffect, useImperativeHandle, type Ref } from 'react';
import { DEFAULT_DISCOVERY_FILTERS, type DiscoveryFilters } from '@/lib/report-discovery';
import { MapExperience } from './map-experience';

const telemetry = vi.hoisted(() => ({ step: vi.fn(), failure: vi.fn(), outcome: vi.fn(), discovery: vi.fn() }));
vi.mock('@/lib/website-analytics', async original => ({ ...await original<object>(), trackParticipation: telemetry.step, trackParticipationFailure: telemetry.failure, trackWebsiteOutcome: telemetry.outcome, trackMapDiscovery: telemetry.discovery }));

const state = vi.hoisted(() => ({
  center: { lat: 0, lng: 0 },
  markerFailure: false,
  markerReports: [] as MappableReport[],
  markerInstances: [] as { map: unknown; position: {lat: number; lng: number}; title: string; glyph?: HTMLElement; click?: () => void }[],
  click: null as null | ((event: unknown) => void),
  idle: null as null | (() => void),
  tiles: null as null | (() => void),
  discovery: vi.fn(),
  panTo: vi.fn(),
  fitBounds: vi.fn(),
  mapOptions: vi.fn(),
  mapLoadGate: undefined as Promise<void> | undefined,
  published: false,
  lostResponse: false,
  inserts: vi.fn(),
  publish: vi.fn(),
  upload: vi.fn(),
  review: vi.fn(),
  saveResult: vi.fn(),
  draftLocation: vi.fn(),
  openAuth: vi.fn(),
  journal: undefined as { userId: string; reportId: string; paths: string[] } | undefined,
}));
const report = () => ({ id: 'test-report', title: 'Test bottles', latitude: 0.5, longitude: 0, user_id: 'test-user', is_published: state.published, photo_paths: ['test-user/test-report/photo.jpg'], cleanup_state: 'available', funding_eligibility: 'eligible', renewal_status: 'active', expires_at: '2099-01-01', cancelled_at: null, expired_at: null, is_sample: false });
vi.mock('@/lib/report-clusters', () => ({ createReportClusters: (map: unknown) => ({ update: (markers: Map<string, { map: unknown }>) => { for (const marker of markers.values()) if (!marker.map) marker.map = map; }, select: vi.fn(), dispose: vi.fn() }) }));
vi.mock('@/lib/cloud-drafts', () => ({ cloudDrafts: { begin: async () => 'test-report', discard: async () => {} } }));
vi.mock('@/lib/discovery-memory', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/discovery-memory')>(), readBrowserMemory: () => null, saveBrowserMemory: () => {}, readDiscoveryMemory: () => null, saveDiscoveryMemory: () => {} }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }), useSearchParams: () => new URLSearchParams(window.location.search) }));
vi.mock('@googlemaps/js-api-loader', () => ({
  setOptions: vi.fn(),
  importLibrary: async (name: string) => { await state.mapLoadGate; return name === 'maps' ? { Map: class {
    constructor(_element: unknown, options: unknown) { state.mapOptions(options); }
    addListener(name: string, callback: (event: unknown) => void) { if (name === 'click') state.click = callback; else if (name === 'idle') state.idle = () => callback(undefined); else if (name === 'tilesloaded') state.tiles = () => callback(undefined); }
    panTo(location: { lat: number; lng: number }) { state.center = location; state.panTo(location); } fitBounds(...args: unknown[]) { state.fitBounds(...args); } setZoom() {} getZoom() { return 14; }
    getBounds() { return { toJSON: () => ({ north: 1, south: -1, west: -1, east: 1 }) }; }
    getCenter() { return { lat: () => state.center.lat, lng: () => state.center.lng }; }
  } } : { AdvancedMarkerElement: class {
    map: unknown; position: {lat: number; lng: number}; title: string; glyph?: HTMLElement; click?: () => void;
    constructor(options: {map: unknown; position: {lat: number; lng: number}; title: string}) {
      if (state.markerFailure) throw new Error('Map renderer unavailable');
      this.map = options.map; this.position = options.position; this.title = options.title; state.markerInstances.push(this);
    }
    private attributes = new Map<string, string>();
    getAttribute(name: string) { return this.attributes.get(name) ?? null; }
    setAttribute(name: string, value: string) { this.attributes.set(name, value); }
    removeAttribute(name: string) { this.attributes.delete(name); }
    append(glyph: HTMLElement) { this.glyph = glyph; }
    addEventListener(name: string, callback: () => void) { if (name === 'gmp-click') this.click = callback; }
  } }; },
}));
vi.mock('@/components/public-site-header', () => ({ PublicSiteHeader: ({ action, reportAction }: { action: React.ReactNode; reportAction: React.ReactNode }) => <>{reportAction}{action}</> }));
vi.mock('@/components/public-account-action', () => ({ PublicAccountAction: ({ ref, onOpenReport, onUserChange }: { ref: Ref<unknown>; onOpenReport: (id: string) => void; onUserChange: (id: string) => void }) => {
  useImperativeHandle(ref, () => ({ openAuth: state.openAuth }));
  return <><button onClick={() => onOpenReport('test-report')}>Open report from history</button><button onClick={() => onUserChange('test-user')}>Finish test sign-in</button></>;
} }));
vi.mock('@/components/report-browser', () => ({ ReportBrowser: ({ reports, onVisibleReportsChange, onDiscoveryFiltersChange, placeSearch }: { onVisibleReportsChange: (reports: MappableReport[]) => void; placeSearch: React.ReactNode; reports: Array<{ title: string }>; onDiscoveryFiltersChange: (filters: DiscoveryFilters) => void }) => {
  useEffect(() => { onDiscoveryFiltersChange(DEFAULT_DISCOVERY_FILTERS); }, [onDiscoveryFiltersChange]);
  return <>{placeSearch}<button onClick={() => onVisibleReportsChange(state.markerReports)}>Refresh visible pins</button><output aria-label="Discovery results">{reports.map(report => report.title).join(',')}</output><button onClick={() => onDiscoveryFiltersChange({ ...DEFAULT_DISCOVERY_FILTERS, status: 'available', severity: 'high' })}>High severity filter</button></>;
} }));
vi.mock('@/components/place-search', () => ({ PlaceSearch: ({onSelect}: {onSelect: (place: unknown) => void}) => <button onClick={() => onSelect({id:'chosen',label:'Chosen area',latitude:1,longitude:2,bounds:{north:2,south:0,west:1,east:3}})}>Choose map area</button> }));
vi.mock('@/lib/synced-report-preferences', () => ({ reportPreferenceSync: { load: async () => ({ preferences: { favorites: [], hidden: [] } }), sync: async () => ({ preferences: { favorites: [], hidden: [] }, offline: false }) } }));
vi.mock('@/lib/report-discovery', async (importOriginal) => ({ ...await importOriginal<typeof import('@/lib/report-discovery')>(), loadDiscoveryReports: (...args: unknown[]) => state.discovery(...args) }));
vi.mock('@/components/report-detail', () => ({ ReportDetail: ({report, onClose}: {report: {title: string}; onClose: () => void}) => <><output aria-label="Linked report">{report.title}</output><button onClick={onClose}>Back to discovery</button></> }));
vi.mock('@/components/resumable-report-wizard', () => ({ ResumableReportWizard: ({ onSubmit, onChangeLocation, selectingLocation, coordinates }: { onSubmit: (draft: ReportDraft, amount: number | null) => Promise<unknown>; onChangeLocation?: () => void; selectingLocation: boolean; coordinates: { latitude: number } }) => {
  const draft = { ...EMPTY_REPORT_DRAFT, photos: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })], selectedTypes: ['Bottles'], severity: 'Low' as const };
  if (selectingLocation) return null;
  return <div role="dialog" aria-label="Report form"><output aria-label="Selected latitude">{coordinates.latitude}</output><button disabled={!onChangeLocation} onClick={onChangeLocation}>Change report location</button><button onClick={() => void onSubmit(draft, null).then(state.saveResult)}>Post without funds</button><button onClick={() => void onSubmit(draft, 500).then(state.saveResult)}>Post with $5</button></div>;
} }));
vi.mock('@/lib/saved-report-draft', () => ({
  reportDraftLocation: (...args: unknown[]) => state.draftLocation(...args),
  loadReportPublication: async () => state.journal,
  saveReportPublication: async (journal: typeof state.journal) => { state.journal = journal; },
  clearReportPublication: async () => { state.journal = undefined; },
  clearPublishedReport: async () => { state.journal = undefined; },
}));
vi.mock('@/components/funding-contribution-action', () => ({ FundingContributionAction: ({ initialAmountCents }: { initialAmountCents: number }) => <output aria-label="Funding handoff">{initialAmountCents}</output> }));
vi.mock('@/lib/secure-media-upload', () => ({ uploadSecureBrowserMedia: (...args: unknown[]) => state.upload(...args) }));
vi.mock('@/lib/funding', () => ({
  loadCleanupFeatureFlags: async () => ({ payments_enabled: true, gemini_financial_review_enabled: true }),
  requestReportPhotoReview: (...args: unknown[]) => state.review(...args),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'test-user', is_anonymous: false } } }) },
  from: () => {
    const chain = {
      select: () => chain, eq: () => chain, is: () => chain, range: () => chain, abortSignal: () => chain, or: () => chain, gt: () => chain, order: () => chain,
      upsert: (value: unknown) => { state.inserts(value); return chain; },
      single: async () => ({ data: report(), error: null }),
      maybeSingle: async () => ({ data: report(), error: null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    return chain;
  },
  rpc: async (...args: unknown[]) => {
    state.publish(...args); state.published = true;
    if (state.lostResponse) { state.lostResponse = false; return { data: null, error: new Error('Lost response') }; }
    return { data: report(), error: null };
  },
}) }));

beforeEach(() => {
  state.center = { lat: 0, lng: 0 }; state.markerFailure = false; state.markerInstances = []; state.markerReports = [];
  state.mapLoadGate = undefined;
  vi.clearAllMocks(); state.discovery.mockReset().mockResolvedValue({ reports: [], truncated: false }); state.idle = null; state.tiles = null; state.journal = undefined; state.click = null; state.published = false; state.lostResponse = false;
  state.upload.mockResolvedValue('test-user/test-report/photo.jpg');
  state.review.mockResolvedValue(undefined);
  state.draftLocation.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: 0, longitude: 0 }, timestamp: Date.now() } as GeolocationPosition),
  } });
});
afterEach(() => { cleanup(); window.history.replaceState({}, '', '/'); });
async function choosePin(latitude = 0.5, valid = true) {
  render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  await waitFor(() => expect(state.click).toBeTruthy());
  const start = screen.queryByRole('button', { name: 'Report Litter' });
  if (start) fireEvent.click(start);
  expect(window.location.pathname).toBe('/report');
  await screen.findByLabelText('Choose report location');
  await act(async () => { state.click!({ latLng: { lat: () => latitude, lng: () => 0 } }); });
  expect(screen.queryByRole('dialog', { name: 'Report form' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Use this location' }));
  if (valid) await screen.findByRole('dialog', { name: 'Report form' });
}

describe('map publication and funding handoff', () => {
  it('lets a guest choose and confirm a pin before account or GPS prompts, then continues at that pin', async () => {
    const gps = vi.fn();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: gps } });
    render(<MapExperience initialReports={[]} initialUserId={null} googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
    await waitFor(() => expect(state.click).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Report Litter' }));
    await screen.findByLabelText('Choose report location');
    expect(state.openAuth).not.toHaveBeenCalled();
    await act(async () => { state.click!({ latLng: { lat: () => 36.123456789, lng: () => -81.987654321 } }); });
    fireEvent.click(screen.getByRole('button', { name: 'Use this location' }));
    expect(state.openAuth).toHaveBeenCalledExactlyOnceWith('report');
    expect(gps).not.toHaveBeenCalled();
    expect(state.draftLocation).not.toHaveBeenCalled();
    expect(state.inserts).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Report form' })).toBeNull();
    const next = new URL(window.location.href);
    expect(next.searchParams.get('report_lat')).toBe('36.123456789');
    expect(next.searchParams.get('report_lng')).toBe('-81.987654321');
    fireEvent.click(screen.getByRole('button', { name: 'Finish test sign-in' }));
    await screen.findByRole('dialog', { name: 'Report form' });
    expect(screen.getByLabelText('Selected latitude').textContent).toBe('36.123456789');
    // Location checks are still required before a real publication.
    fireEvent.click(screen.getByRole('button', { name: 'Post without funds' }));
    await waitFor(() => expect(gps).toHaveBeenCalled());
    expect(state.inserts).not.toHaveBeenCalled();
  });
  it('opens a signed-out direct report entry at the picker without reading an account draft', async () => {
    window.history.replaceState({}, '', '/report?community=us-nc-boone');
    render(<MapExperience initialReports={[]} initialUserId={null} googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
    await screen.findByLabelText('Choose report location');
    expect(state.openAuth).not.toHaveBeenCalled();
    expect(state.draftLocation).not.toHaveBeenCalled();
  });
  it('restores a confirmed pin after a full OAuth/email browser return, ahead of the old viewport', async () => {
    window.history.replaceState({}, '', '/report?report_lat=36.123&report_lng=-81.987&lat=40&lng=-74&zoom=12#map=40,-74,12');
    render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
    await screen.findByRole('dialog', { name: 'Report form' });
    expect(screen.getByLabelText('Selected latitude').textContent).toBe('36.123');
    await waitFor(() => expect(state.mapOptions).toHaveBeenCalledWith(expect.objectContaining({ center: { lat: 36.123, lng: -81.987 } })));
    expect(state.inserts).not.toHaveBeenCalled();
  });
  it('does not fit a community or homepage area over the confirmed report pin on return', async () => {
    window.history.replaceState({}, '', '/report?community=us-nc-boone&area=community-us-nc-boone&entry=boone&report_lat=36.123&report_lng=-81.987');
    const initialPlace = { id: 'community-us-nc-boone', label: 'Boone', subtitle: 'North Carolina', latitude: 36.2, longitude: -81.6, bounds: { north: 36.3, south: 36.1, west: -81.8, east: -81.5 } };
    render(<MapExperience initialReports={[]} initialPlace={initialPlace} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
    await screen.findByRole('dialog', { name: 'Report form' });
    await waitFor(() => expect(state.mapOptions).toHaveBeenCalled());
    expect(state.fitBounds).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Selected latitude').textContent).toBe('36.123');
  });
  it('clears a guest selection when canceling instead of reusing it for a new report', async () => {
    window.history.replaceState({}, '', '/report?report_lat=36&report_lng=-81');
    render(<MapExperience initialReports={[]} initialUserId={null} googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
    await screen.findByLabelText('Choose report location');
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel reporting' })[0]);
    expect(window.location.pathname).toBe('/map');
    expect(window.location.search).not.toContain('report_lat');
    fireEvent.click(screen.getByRole('button', { name: 'Report Litter' }));
    await screen.findByLabelText('Choose report location');
    expect(state.openAuth).toHaveBeenCalledTimes(1);
  });
  it('keeps the navigation and filter hosts mounted when entering and canceling report placement', async () => {
    render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
    await waitFor(() => expect(state.click).toBeTruthy());
    const filters = screen.getByRole('button', { name: /^Filters$/ });
    const navigation = screen.getByRole('group', { name: 'Browse reports' });
    const quickFilters = document.querySelector('.discovery-quick-filters');
    const mapStarts = state.mapOptions.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Report Litter' }));
    await screen.findByLabelText('Choose report location');
    expect(screen.getByRole('button', { name: /^Filters$/ })).toBe(filters);
    expect(screen.getByRole('group', { name: 'Browse reports' })).toBe(navigation);
    expect(document.querySelector('.discovery-quick-filters')).toBe(quickFilters);
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel reporting' })[0]);
    await screen.findByRole('button', { name: 'Report Litter' });
    expect(screen.getByRole('group', { name: 'Browse reports' })).toBe(navigation);
    expect(state.mapOptions.mock.calls.length).toBe(mapStarts);
  });
  it('keeps the report button label and icon steady while checking a saved phone draft', async () => {
    let finish!: (value: undefined) => void;
    state.draftLocation.mockImplementation(() => new Promise<undefined>(resolve => { finish = resolve; }));
    render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
    await waitFor(() => expect(state.click).toBeTruthy());
    const button = screen.getByRole('button', { name: 'Report Litter' });
    fireEvent.click(button);
    expect(button.textContent).toBe('Report Litter');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('.map-report-bug')).toBeTruthy();
    fireEvent.click(button);
    expect(state.draftLocation).toHaveBeenCalledTimes(1);
    await act(async () => finish(undefined));
    await screen.findByLabelText('Choose report location');
    expect(screen.queryByText('Opening…')).toBeNull();
  });
  it('centers a linked report even when its details load before the map', async () => {
    let finishMapLoad!: () => void;
    state.mapLoadGate = new Promise<void>(resolve => { finishMapLoad = resolve; });
    state.published = true;
    window.history.replaceState({}, '', '/map?report=test-report&lat=48.85&lng=2.35&zoom=12');
    render(<MapExperience initialReports={[report() as MappableReport]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
    await screen.findByLabelText('Linked report');
    expect(state.mapOptions).not.toHaveBeenCalled();
    await act(async () => { finishMapLoad(); });
    await waitFor(() => expect(state.panTo).toHaveBeenCalledWith({ lat: 0.5, lng: 0 }));
  });
  it('allows private preparation after location denial but still blocks publication', async () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_success: PositionCallback, fail: PositionErrorCallback) => fail({code:1} as GeolocationPositionError) } });
    await choosePin(0.5, false);
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(document.querySelector('.report-placement-pin')).toBeTruthy();
    expect(state.panTo).toHaveBeenCalledExactlyOnceWith({ lat: 0.5, lng: 0 });
    fireEvent.click(screen.getByRole('button', {name:'Continue as draft'}));
    await screen.findByRole('dialog', {name:'Report form'});
    expect(screen.getByLabelText('Selected latitude').textContent).toBe('0.5');
    fireEvent.click(screen.getByRole('button', {name:'Post without funds'}));
    await waitFor(()=>expect(state.saveResult).toHaveBeenCalled());
    expect(state.upload).not.toHaveBeenCalled();expect(state.publish).not.toHaveBeenCalled();expect(state.inserts).not.toHaveBeenCalled();
  });

  it('starts a signed-in draft at the chosen pin without first requesting location', async () => {
    const gps = vi.fn();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: gps } });
    window.history.replaceState({}, '', '/report');
    render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
    const draft = await screen.findByRole('button', { name: 'Continue as draft' });
    await waitFor(() => expect(state.click).toBeTruthy());
    act(() => state.click!({ latLng: { lat: () => 0.6, lng: () => 0 } }));
    fireEvent.click(draft);
    await screen.findByRole('dialog', { name: 'Report form' });
    expect(screen.getByLabelText('Selected latitude').textContent).toBe('0.6');
    expect(gps).not.toHaveBeenCalled();
  });

  it('returns a directly opened report to the default report list', async () => {
    state.published = true;
    window.history.replaceState({}, '', '/?report=test-report');
    render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
    await screen.findByLabelText('Linked report');
    fireEvent.click(screen.getByRole('button', { name: 'Back to discovery' }));
    expect(screen.getAllByRole('button', { name: 'Reports' }).every(button => button.getAttribute('aria-pressed') === 'true')).toBe(true);
    expect(new URL(window.location.href).searchParams.has('report')).toBe(false);
  });

  it('recovers a published report after a full map remount without another upload or insert', async () => {
    state.lostResponse = true;
    await choosePin();
    fireEvent.click(await screen.findByRole('button', { name: 'Post with $5' }));
    await waitFor(() => expect(state.saveResult).toHaveBeenCalled());
    expect(state.journal).toBeTruthy();
    expect(telemetry.outcome).not.toHaveBeenCalled();
    expect(telemetry.failure).toHaveBeenCalledWith('report', 'review', 'publication_unconfirmed');
    cleanup();
    await choosePin();
    fireEvent.click(await screen.findByRole('button', { name: 'Post with $5' }));
    await waitFor(() => expect(screen.getByLabelText('Funding handoff').textContent).toBe('500'));
    expect(state.upload).toHaveBeenCalledTimes(1);
    expect(state.inserts).toHaveBeenCalledTimes(1);
    expect(state.publish).toHaveBeenCalledTimes(1);
    expect(state.journal).toBeUndefined();
  });

  it('allows a pin about 35 miles away and publishes without opening funding when no contribution is chosen', async () => {
    await choosePin();
    fireEvent.click(await screen.findByRole('button', { name: 'Post without funds' }));
    await waitFor(() => expect(state.publish).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByLabelText('Funding handoff')).toBeNull();
    expect(state.publish).toHaveBeenCalledWith('publish_report', expect.objectContaining({ current_latitude: 0, current_longitude: 0 }));
    expect(telemetry.outcome).toHaveBeenCalledExactlyOnceWith('report_published', 'test-report');
    expect(telemetry.step).toHaveBeenCalledWith('report', 'location_confirmed');
  });

  it('rejects a distant selection before opening the form or uploading', async () => {
    await choosePin(1, false);
    expect((await screen.findByRole('alert')).textContent).toContain('within 50 miles');
    expect(telemetry.failure).toHaveBeenCalledWith('report', 'location_picker', 'location_out_of_range');
    expect(screen.queryByRole('dialog', { name: 'Report form' })).toBeNull();
    expect(state.upload).not.toHaveBeenCalled();
    expect(state.inserts).not.toHaveBeenCalled();
  });

  it('preserves the original selected amount when a publication response is lost', async () => {
    state.lostResponse = true;
    await choosePin();
    fireEvent.click(await screen.findByRole('button', { name: 'Post with $5' }));
    await waitFor(() => expect(state.publish).toHaveBeenCalledTimes(1));
    expect((screen.getByRole('button', { name: 'Change report location' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Post with $5' }));
    expect((await screen.findByLabelText('Funding handoff')).textContent).toBe('500');
    expect(state.inserts).toHaveBeenCalledTimes(1);
    expect(state.upload).toHaveBeenCalledTimes(1);
    expect(state.publish).toHaveBeenCalledTimes(1);
  });
  it('honors switching to no contribution before retrying a lost publication response', async () => {
    state.lostResponse = true;
    await choosePin();
    fireEvent.click(await screen.findByRole('button', { name: 'Post with $5' }));
    await waitFor(() => expect(state.publish).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Post without funds' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByLabelText('Funding handoff')).toBeNull();
    expect(state.inserts).toHaveBeenCalledTimes(1);
  });

  it('publishes at the changed pin after returning to the existing draft', async () => {
    await choosePin();
    fireEvent.click(screen.getByRole('button', { name: 'Change report location' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await act(async () => { state.click!({ latLng: { lat: () => 0.6, lng: () => 0 } }); });
    fireEvent.click(screen.getByRole('button', { name: 'Use this location' }));
    expect((await screen.findByLabelText('Selected latitude')).textContent).toBe('0.6');
    fireEvent.click(screen.getByRole('button', { name: 'Post without funds' }));
    await waitFor(() => expect(state.inserts).toHaveBeenCalledWith(expect.objectContaining({ latitude: 0.6 })));
  });

  it('retains the previous pin when a location change is canceled', async () => {
    await choosePin();
    fireEvent.click(screen.getByRole('button', { name: 'Change report location' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Keep location' }));
    expect(screen.getByLabelText('Selected latitude').textContent).toBe('0.5');
  });

  it.each(['Cancel', 'Escape'])('returns to browsing with %s during a location check', async (action) => {
    let resolveLocation: PositionCallback | undefined;
    const getCurrentPosition = (success: PositionCallback) => { resolveLocation = success; };
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
    window.history.replaceState({}, '', '/report');
    render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
    const confirm = await screen.findByRole<HTMLButtonElement>('button', { name: 'Use this location' });
    await waitFor(() => expect(confirm.disabled).toBe(false));
    fireEvent.click(confirm);
    await screen.findByRole('button', { name: 'Checking…' });
    if (action === 'Cancel') fireEvent.click(screen.getByRole('button', { name: 'Cancel reporting' }));
    else fireEvent.keyDown(window, { key: 'Escape' });
    await act(async () => {
      resolveLocation!({ coords: { latitude: 0, longitude: 0 }, timestamp: Date.now() } as GeolocationPosition);
    });
    expect(screen.queryByLabelText('Choose report location')).toBeNull();
    expect(window.location.pathname).toBe('/map');
    expect(screen.queryByRole('dialog', { name: 'Report form' })).toBeNull();
  });

  it('keeps the saved pin when closing a draft location change', async () => {
    await choosePin();
    fireEvent.click(screen.getByRole('button', { name: 'Change report location' }));
    await act(async () => { state.click!({ latLng: { lat: () => 0.6, lng: () => 0 } }); });
    fireEvent.click(screen.getByRole('button', { name: 'Keep location' }));
    expect(screen.getByLabelText('Selected latitude').textContent).toBe('0.5');
  });

  it('explains denied GPS before starting a new report', async () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, failure: PositionErrorCallback) => failure({ code: 1 } as GeolocationPositionError));
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
    await choosePin(0.5, false);
    expect((await screen.findByRole('alert')).textContent).toContain('Allow location access');
    expect(telemetry.failure).toHaveBeenCalledWith('report', 'location_picker', 'location_denied');
    expect(screen.queryByRole('dialog', { name: 'Report form' })).toBeNull();
    expect(state.upload).not.toHaveBeenCalled();
    expect(state.inserts).not.toHaveBeenCalled();
  });

  it('opens location selection directly from /report with the list closed', async () => {
    window.history.replaceState({}, '', '/report');
    render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
    await screen.findByRole('button', { name: 'Use this location' });
    expect(document.querySelector('main')?.classList.contains('showing-reports')).toBe(false);
    expect(screen.getByRole('group', { name: 'Browse reports' })).toBeTruthy();
  });

  it('checks fresh GPS again at publication after a valid selection', async () => {
    await choosePin();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_success: PositionCallback, failure: PositionErrorCallback) => failure({ code: 1 } as GeolocationPositionError) } });
    fireEvent.click(screen.getByRole('button', { name: 'Post without funds' }));
    await waitFor(() => expect(state.saveResult).toHaveBeenCalledWith(expect.stringContaining('Allow location access')));
    expect(telemetry.failure).toHaveBeenCalledWith('report', 'review', 'location_denied');
    expect(state.upload).not.toHaveBeenCalled();
  });

});


it('keeps the latest discovery result when an obsolete request resolves later', async () => {
  let resolveOld!: (result: unknown) => void;
  state.discovery.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
  state.discovery.mockResolvedValueOnce({ reports: [{ ...report(), title: 'Current high severity' }], truncated: false });
  render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  await waitFor(() => expect(state.idle).toBeTruthy());
  act(() => state.idle!());
  await waitFor(() => expect(state.discovery).toHaveBeenCalledTimes(1));
  const oldSignal = state.discovery.mock.calls[0][1].signal;
  fireEvent.click(screen.getByRole('button', { name: 'High severity filter' }));
  await waitFor(() => expect(screen.getByLabelText('Discovery results').textContent).toBe('Current high severity'));
  expect(oldSignal.aborted).toBe(true);
  await act(async () => resolveOld({ reports: [{ ...report(), title: 'Obsolete result' }], truncated: false }));
  expect(screen.getByLabelText('Discovery results').textContent).toBe('Current high severity');
});

it('opens a shared report outside the initial discovery page', async () => {
  state.published = true;
  window.history.replaceState({}, '', '/?report=test-report');
  render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  expect((await screen.findByLabelText('Linked report')).textContent).toBe('Test bottles');
  expect(window.location.search).toBe('?report=test-report');
});

it('starts in Boone and loads the visible area without requesting GPS or adding a city filter', async () => {
  const getCurrentPosition = vi.fn();
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
  render(<MapExperience initialReports={[]} initialUserId={null} googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  await waitFor(() => expect(state.idle).toBeTruthy());
  expect(state.mapOptions).toHaveBeenCalledWith(expect.objectContaining({ center: { lat: 36.2168, lng: -81.6746 }, zoom: 12 }));
  act(() => state.idle!());
  await waitFor(() => expect(state.discovery).toHaveBeenCalled());
  expect(state.discovery).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({
    area: expect.objectContaining({ north: 1, south: -1, west: -1, east: 1 }),
    filters: expect.objectContaining({ radius: 0, status: 'all' }), geometry: undefined,
  }));
  expect(getCurrentPosition).not.toHaveBeenCalled();
  expect(window.location.search).not.toContain('area=');
  expect(screen.queryByText(/Choose a city|Where would you like/)).toBeNull();
});

it('preserves a shared map viewport instead of resetting it to Boone', async () => {
  window.history.replaceState({}, '', '/?lat=35.994&lng=-78.899&zoom=13');
  render(<MapExperience initialReports={[]} initialUserId={null} googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  await waitFor(() => expect(state.mapOptions).toHaveBeenCalled());
  expect(state.mapOptions).toHaveBeenCalledWith(expect.objectContaining({ center: { lat: 35.994, lng: -78.899 }, zoom: 13 }));
});

it('uses the visible map after restoring a legacy town boundary, including later pans', async () => {
  const initialPlace = { id: 'legacy-town', label: 'A town', subtitle: 'Town', latitude: 0, longitude: 0,
    bounds: { north: .1, south: -.1, west: -.1, east: .1 },
    geometry: { type: 'Polygon' as const, coordinates: [[[-.1, -.1], [.1, -.1], [.1, .1], [-.1, .1], [-.1, -.1]]] } };
  render(<MapExperience initialReports={[]} initialUserId={null} googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" initialPlace={initialPlace} />);
  await waitFor(() => expect(state.idle).toBeTruthy());
  act(() => state.idle!());
  await waitFor(() => expect(state.discovery).toHaveBeenCalled());
  expect(state.discovery.mock.calls.at(-1)?.[1]).toMatchObject({ geometry: undefined, area: { north: 1, south: -1 } });
  state.center = { lat: 2, lng: 2 };
  act(() => state.idle!());
  await waitFor(() => expect(state.discovery.mock.calls.at(-1)?.[1].area.latitude).toBe(2));
  expect(state.discovery.mock.calls.at(-1)?.[1].geometry).toBeUndefined();
});

it('keeps a location selected while the map library is still loading', async () => {
  window.history.replaceState({}, '', '/?lat=39.799&lng=-98.649&zoom=11');
  render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  expect(state.click).toBeNull();
  fireEvent.click(screen.getAllByRole('button', { name: 'Choose map area' }).at(-1)!);
  await waitFor(() => expect(state.click).toBeTruthy());
  expect(state.fitBounds).toHaveBeenCalledWith({north:2,south:0,west:1,east:3},60);
  expect(state.mapOptions).toHaveBeenCalledWith(expect.objectContaining({center:{lat:1,lng:2}}));
  expect(state.panTo).not.toHaveBeenCalled();
});

it('opens an account report even when it is absent from discovery results', async () => {
  state.published = true;
  render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  fireEvent.click(screen.getByRole('button', { name: 'Open report from history' }));
  expect((await screen.findByLabelText('Linked report')).textContent).toBe('Test bottles');
});


it('keeps pins attached during refresh and reorder, updates changed artwork, and only removes missing pins', async () => {
  render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  await waitFor(() => expect(state.click).toBeTruthy());
  const first = { ...report(), funded_amount_cents: 500 } as MappableReport;
  const second = { ...first, id: 'second', longitude: 0.2 };
  state.markerReports = [first, second];
  fireEvent.click(screen.getByRole('button', {name: 'Refresh visible pins'}));
  expect(state.markerInstances).toHaveLength(2);
  const [pin, other] = state.markerInstances;
  const attachedMap = pin.map;
  const glyph = pin.glyph!;
  glyph.classList.add('report-map-marker-previewed');
  state.markerReports = [{...second}, {...first}];
  fireEvent.click(screen.getByRole('button', {name: 'Refresh visible pins'}));
  expect(state.markerInstances).toHaveLength(2);
  expect(pin.map).toBe(attachedMap);
  expect(pin.glyph).toBe(glyph);
  expect(glyph.classList.contains('report-map-marker-previewed')).toBe(true);
  state.markerReports = [{...first, title: 'Cleaned bottles', cleanup_state: 'completed', latitude: 0.6}];
  fireEvent.click(screen.getByRole('button', {name: 'Refresh visible pins'}));
  expect(state.markerInstances).toHaveLength(2);
  expect(pin.map).toBe(attachedMap);
  expect(pin.title).toBe('Cleaned bottles');
  expect(pin.position.lat).toBe(0.6);
  expect(glyph.querySelector('.sr-only')?.textContent).toBe('Done');
  expect(glyph.classList.contains('report-map-marker-completed')).toBe(true);
  expect(glyph.classList.contains('report-map-marker-available')).toBe(false);
  expect(other.map).toBeNull();
});

it('keeps the website usable when the map provider fails to create a pin', async () => {
  state.markerFailure = true; state.markerReports = [{ ...report(), is_published: true } as MappableReport];
  render(<MapExperience initialReports={state.markerReports} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  await waitFor(() => expect(state.idle).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Refresh visible pins' }));
  await screen.findByText(/map could not display its pins/);
  expect(screen.getByRole('button', { name: 'Report Litter' })).toBeTruthy();
});

it('honors an explicit Map link and keeps the tab choice on refresh', async () => {
  window.history.replaceState({}, '', '/?view=map');
  const rendered = render(<MapExperience initialReports={[]} initialUserId={null} googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  await waitFor(() => expect(document.querySelector('main')?.classList.contains('showing-reports')).toBe(false));
  fireEvent.click(screen.getAllByRole('button', { name: /^Reports$/ })[0]);
  expect(new URL(window.location.href).searchParams.get('view')).toBe('reports');
  rendered.unmount();
  render(<MapExperience initialReports={[]} initialUserId={null} googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  await waitFor(() => expect(document.querySelector('main')?.classList.contains('showing-reports')).toBe(true));
});

it('falls back to reports when the map never supplies a viewport', async () => {
  vi.useFakeTimers();
  try {
    render(<MapExperience initialReports={[]} initialUserId={null} googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(12500); });
    expect(screen.getByText(/map is taking too long/)).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(state.discovery).toHaveBeenCalled();
  } finally { vi.useRealTimers(); }
});


it('keeps the map covered until its tiles are ready, then leaves it visible during later searches', async () => {
  render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="test-key" googleMapsMapId="test-map" initialError="" />);
  await waitFor(() => expect(state.tiles).toBeTruthy());
  const cover = document.querySelector('.map-loading-cover')!;
  expect(cover.classList.contains('map-loading-complete')).toBe(false);
  act(() => state.idle!());
  expect(cover.classList.contains('map-loading-complete')).toBe(false);
  act(() => state.tiles!());
  expect(cover.classList.contains('map-loading-complete')).toBe(true);
  act(() => state.idle!());
  expect(cover.classList.contains('map-loading-complete')).toBe(true);
});

it('renders an explicit map URL without briefly opening the report list', () => {
  window.history.replaceState(null, '', '/?view=map');
  render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="" googleMapsMapId="" initialError="" />);
  expect(document.querySelector('.website-experience')?.classList.contains('showing-reports')).toBe(false);
});

it('opens a pin directly in report details, using the latest refreshed report data', async () => {
  render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  await waitFor(() => expect(state.click).toBeTruthy());
  state.markerReports = [{ ...report(), title: 'Original title' } as MappableReport];
  fireEvent.click(screen.getByRole('button', { name: 'Refresh visible pins' }));
  state.markerReports = [{ ...state.markerReports[0], title: 'Updated cleanup' }];
  fireEvent.click(screen.getByRole('button', { name: 'Refresh visible pins' }));
  act(() => state.markerInstances[0].click!());
  expect(screen.getByLabelText('Linked report').textContent).toBe('Updated cleanup');
  expect(telemetry.discovery).toHaveBeenCalledWith('report_opened', { source: 'map_pin' });
  expect(screen.queryByLabelText('Selected map report')).toBeNull();
  expect(new URLSearchParams(window.location.search).get('report')).toBe('test-report');
  fireEvent.click(screen.getByRole('button', { name: 'Back to discovery' }));
  expect(screen.queryByLabelText('Linked report')).toBeNull();
});

it('exits the map loading state when tiles time out and recovers if they arrive later', async () => {
  vi.useFakeTimers();
  try {
    render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
    await act(async () => { await vi.advanceTimersByTimeAsync(12000); });
    expect(screen.getByText('Map unavailable')).toBeTruthy();
    expect(document.querySelector('.map-loading-cover')).toBeNull();
    act(() => state.tiles!());
    expect(screen.queryByText('Map unavailable')).toBeNull();
    expect(document.querySelector('.map-loading-complete')).toBeTruthy();
  } finally { vi.useRealTimers(); }
});

it('opens map-first links minimized, reveals details and dismisses them onto the map', async () => {
  state.published = true;
  window.history.replaceState({}, '', '/map?report=test-report&intent=locate&view=map&returnTo=%2Fcommunities%2Fus%2Fnc%2Fboone');
  render(<MapExperience initialReports={[report() as MappableReport]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" initialPlace={{id:'community-us-nc-boone',label:'Boone',subtitle:'Boone boundary',latitude:36,longitude:-81,bounds:{north:37,south:35,east:-80,west:-82}}} />);
  const summary = await screen.findByRole('button', {name:/Open report details:/});
  expect(screen.queryByLabelText('Linked report')).toBeNull();
  await waitFor(() => expect(state.panTo).toHaveBeenCalledWith({lat:0.5,lng:0}));
  expect(state.fitBounds).not.toHaveBeenCalled();
  expect(state.markerInstances.some(marker => marker.title === report().title)).toBe(true);
  fireEvent.click(summary);
  expect(screen.getByLabelText('Linked report')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name:'Back to discovery'}));
  expect(screen.getByRole('button', {name:/Open report details:/})).toBeTruthy();
  expect(window.location.pathname).toBe('/map');
  expect(new URL(window.location.href).searchParams.get('report')).toBe('test-report');
});

it('returns the main Map entry to the homepage Boone frame and clears every discovery filter', async () => {
  const { LITTER_MAP_HREF, MAP_HOME_EVENT } = await import('@/lib/home-map-link');
  const { BOONE_MAP_BOUNDS } = await import('@/lib/map-preview-frame');
  window.history.replaceState({}, '', '/map?view=reports&browse=1&status=available&funding=funded&radius=5&severity=high&scope=favorites&q=bottles&sort=closest&lat=40.7&lng=-74&zoom=15');
  render(<MapExperience initialReports={[]} initialUserId={null} googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  await waitFor(() => expect(state.idle).toBeTruthy());
  const event = new Event(MAP_HOME_EVENT, { cancelable: true });
  act(() => { window.dispatchEvent(event); });
  expect(event.defaultPrevented).toBe(true);
  expect(`${window.location.pathname}${window.location.search}`).toBe(LITTER_MAP_HREF);
  expect(state.fitBounds).toHaveBeenLastCalledWith(BOONE_MAP_BOUNDS, 32);
  const { readBrowserUrl } = await import('@/lib/discovery-memory');
  expect(readBrowserUrl(window.location.search)?.filters).toEqual(DEFAULT_DISCOVERY_FILTERS);
  expect(window.location.search).not.toMatch(/status=|funding=|severity=|radius=|scope=|q=|sort=|area=/);
});

it('fits the homepage Boone bounds on a fresh main Map entry', async () => {
  const { LITTER_MAP_HREF } = await import('@/lib/home-map-link');
  const { BOONE_MAP_BOUNDS, BOONE_MAP_CENTER } = await import('@/lib/map-preview-frame');
  window.history.replaceState({}, '', LITTER_MAP_HREF);
  render(<MapExperience initialReports={[]} initialUserId={null} googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  await waitFor(() => expect(state.fitBounds).toHaveBeenCalledWith(BOONE_MAP_BOUNDS, 32));
  expect(state.mapOptions.mock.calls[0][0].center.lat).toBeCloseTo(BOONE_MAP_CENTER.latitude, 5);
  expect(state.mapOptions.mock.calls[0][0].center.lng).toBeCloseTo(BOONE_MAP_CENTER.longitude, 5);
});

it('does not count pending or failed map loads as empty, and records only settled results', async () => {
  let finish!: (result: { reports: MappableReport[]; truncated: boolean }) => void;
  state.discovery.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  await waitFor(() => expect(state.tiles).toBeTruthy());
  act(() => { state.tiles!(); state.idle!(); });
  await waitFor(() => expect(state.discovery).toHaveBeenCalled());
  expect(telemetry.discovery).not.toHaveBeenCalled();
  await act(async () => finish({ reports: [], truncated: false }));
  await waitFor(() => expect(telemetry.discovery).toHaveBeenCalledWith('results_empty', expect.objectContaining({ result_bucket: '0', truncated: false })));
  telemetry.discovery.mockClear();
  state.discovery.mockRejectedValue(new Error('private backend message'));
  state.center = { lat: 0.3, lng: 0.3 };
  act(() => state.idle!());
  await waitFor(() => expect(telemetry.discovery).toHaveBeenCalledWith('results_failed', expect.objectContaining({ surface: 'map' })));
  expect(telemetry.discovery).not.toHaveBeenCalledWith('results_empty', expect.anything());
});

it('previews and opens the closest report before the map results refresh', async () => {
  window.history.replaceState({}, '', '/map?view=map');
  const closest = { ...report(), is_published: true };
  state.discovery.mockImplementation((_client, { limit }) => Promise.resolve({
    reports: limit === Infinity ? [closest] : [],
    truncated: false,
  }));
  render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  await waitFor(() => expect(state.tiles).toBeTruthy());
  act(() => { state.tiles!(); state.idle!(); });
  fireEvent.click(await screen.findByRole('button', { name: 'Find closest reports' }));
  fireEvent.click(await screen.findByRole('button', { name: 'View on map' }));
  const pin = state.markerInstances.find(marker => marker.title === closest.title);
  expect(pin?.glyph?.classList.contains('report-map-marker-closest')).toBe(true);
  expect(pin?.glyph?.querySelector('.map-pin-card strong')?.textContent).toBe(closest.title);
  expect(state.panTo).toHaveBeenCalledWith({ lat: closest.latitude, lng: closest.longitude });
  act(() => pin?.click?.());
  expect((await screen.findByLabelText('Linked report')).textContent).toBe(closest.title);
});

it('finds a different report on the empty desktop map while keeping the current report open', async () => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(min-width: 1100px)', addEventListener() {}, removeEventListener() {},
  }));
  try {
    window.history.replaceState({}, '', '/map?view=map&report=test-report');
    state.published = true;
    const opened = report() as MappableReport;
    const nearby = { ...opened, id: 'nearby-report', title: 'Nearby litter', latitude: 0.6 };
    state.discovery.mockImplementation((_client, { limit }) => Promise.resolve({
      reports: limit === Infinity ? [opened, nearby] : [],
      truncated: false,
    }));
    render(<MapExperience initialReports={[opened]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
    await screen.findByLabelText('Linked report');
    await waitFor(() => expect(state.tiles).toBeTruthy());
    act(() => { state.tiles!(); state.idle!(); });
    fireEvent.click(await screen.findByRole('button', { name: 'Find closest reports' }));
    await screen.findByText(nearby.title);
    fireEvent.click(screen.getByRole('button', { name: 'View on map' }));
    const pin = state.markerInstances.find(marker => marker.title === nearby.title);
    expect(pin?.glyph?.classList.contains('report-map-marker-closest')).toBe(true);
    expect(screen.getByLabelText('Linked report').textContent).toBe(opened.title);
    expect(new URLSearchParams(window.location.search).get('report')).toBe(opened.id);
    act(() => pin?.click?.());
    await waitFor(() => expect(screen.getByLabelText('Linked report').textContent).toBe(nearby.title));
  } finally {
    cleanup();
    vi.unstubAllGlobals();
  }
});
