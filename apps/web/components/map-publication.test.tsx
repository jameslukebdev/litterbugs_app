// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_REPORT_DRAFT, type ReportDraft } from '@litterbugs/report-contract';
import { MapExperience } from './map-experience';

const state = vi.hoisted(() => ({
  click: null as null | ((event: unknown) => void),
  idle: null as null | (() => void),
  discovery: vi.fn(),
  panTo: vi.fn(),
  fitBounds: vi.fn(),
  published: false,
  lostResponse: false,
  inserts: vi.fn(),
  publish: vi.fn(),
  upload: vi.fn(),
  review: vi.fn(),
  saveResult: vi.fn(),
  journal: undefined as { userId: string; reportId: string; paths: string[] } | undefined,
}));
const report = () => ({ id: 'test-report', title: 'Test bottles', latitude: 0.5, longitude: 0, user_id: 'test-user', is_published: state.published, photo_paths: ['test-user/test-report/photo.jpg'], cleanup_state: 'available', funding_eligibility: 'eligible', renewal_status: 'active', expires_at: '2099-01-01', cancelled_at: null, expired_at: null, is_sample: false });
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@googlemaps/js-api-loader', () => ({
  setOptions: vi.fn(),
  importLibrary: async (name: string) => name === 'maps' ? { Map: class {
    addListener(name: string, callback: (event: unknown) => void) { if (name === 'click') state.click = callback; else if (name === 'idle') state.idle = () => callback(undefined); }
    panTo(...args: unknown[]) { state.panTo(...args); } fitBounds(...args: unknown[]) { state.fitBounds(...args); } setZoom() {} getZoom() { return 14; }
    getBounds() { return { toJSON: () => ({ north: 1, south: -1, west: -1, east: 1 }) }; }
    getCenter() { return { lat: () => 0, lng: () => 0 }; }
  } } : { AdvancedMarkerElement: class {} },
}));
vi.mock('@/components/public-site-header', () => ({ PublicSiteHeader: ({ action }: { action: React.ReactNode }) => action }));
vi.mock('@/components/public-account-action', () => ({ PublicAccountAction: ({ onOpenReport }: { onOpenReport: (id: string) => void }) => <button onClick={() => onOpenReport('test-report')}>Open report from history</button> }));
vi.mock('@/components/report-browser', () => ({ ReportBrowser: ({ reports, onDiscoveryFiltersChange, placeSearch }: { placeSearch: React.ReactNode; reports: Array<{ title: string }>; onDiscoveryFiltersChange: (filters: unknown) => void }) => <>{placeSearch}<output aria-label="Discovery results">{reports.map(report => report.title).join(',')}</output><button onClick={() => onDiscoveryFiltersChange({ status: 'available', funding: 'all', severity: 'high', radius: 0, query: '', scope: 'all' })}>High severity filter</button></> }));
vi.mock('@/components/place-search', () => ({ PlaceSearch: ({onSelect}: {onSelect: (place: unknown) => void}) => <button onClick={() => onSelect({id:'chosen',label:'Chosen area',latitude:1,longitude:2,bounds:{north:2,south:0,west:1,east:3}})}>Choose map area</button> }));
vi.mock('@/lib/report-discovery', async (importOriginal) => ({ ...await importOriginal<typeof import('@/lib/report-discovery')>(), loadDiscoveryReports: (...args: unknown[]) => state.discovery(...args) }));
vi.mock('@/components/report-detail', () => ({ ReportDetail: ({report}: {report: {title: string}}) => <output aria-label="Linked report">{report.title}</output> }));
vi.mock('@/components/resumable-report-wizard', () => ({ ResumableReportWizard: ({ onSubmit, onChangeLocation, selectingLocation, coordinates }: { onSubmit: (draft: ReportDraft, amount: number | null) => Promise<unknown>; onChangeLocation?: () => void; selectingLocation: boolean; coordinates: { latitude: number } }) => {
  const draft = { ...EMPTY_REPORT_DRAFT, photos: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })], selectedTypes: ['Bottles'], severity: 'Low' as const };
  if (selectingLocation) return null;
  return <div role="dialog" aria-label="Report form"><output aria-label="Selected latitude">{coordinates.latitude}</output><button disabled={!onChangeLocation} onClick={onChangeLocation}>Change report location</button><button onClick={() => void onSubmit(draft, null).then(state.saveResult)}>Post without funds</button><button onClick={() => void onSubmit(draft, 500).then(state.saveResult)}>Post with $5</button></div>;
} }));
vi.mock('@/lib/saved-report-draft', () => ({
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
      insert: (value: unknown) => { state.inserts(value); return chain; },
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
  vi.clearAllMocks(); state.discovery.mockReset().mockResolvedValue({ reports: [], truncated: false }); state.idle = null; state.journal = undefined; state.click = null; state.published = false; state.lostResponse = false;
  state.upload.mockResolvedValue('test-user/test-report/photo.jpg');
  state.review.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: 0, longitude: 0 }, timestamp: Date.now() } as GeolocationPosition),
  } });
});
afterEach(() => { cleanup(); window.history.replaceState({}, '', '/'); });
async function choosePin(latitude = 0.5) {
  render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  await waitFor(() => expect(state.click).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: 'Report litter' }));
  await act(async () => { state.click!({ latLng: { lat: () => latitude, lng: () => 0 } }); });
}

describe('map publication and funding handoff', () => {
  it('recovers a published report after a full map remount without another upload or insert', async () => {
    state.lostResponse = true;
    await choosePin();
    fireEvent.click(await screen.findByRole('button', { name: 'Post with $5' }));
    await waitFor(() => expect(state.saveResult).toHaveBeenCalled());
    expect(state.journal).toBeTruthy();
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
  });

  it('allows preparing a distant draft but rejects publication before uploading', async () => {
    await choosePin(1);
    fireEvent.click(screen.getByRole('button', { name: 'Post without funds' }));
    await waitFor(() => expect(state.saveResult).toHaveBeenCalledWith(expect.stringContaining('within 50 miles')));
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
    expect(screen.getByLabelText('Selected latitude').textContent).toBe('0.6');
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

  it('permits preparing and moving a draft without GPS but requires it to publish', async () => {
    const getCurrentPosition = vi.fn((_success: PositionCallback, failure: PositionErrorCallback) => failure({ code: 1 } as GeolocationPositionError));
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
    await choosePin();
    getCurrentPosition.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Change report location' }));
    await act(async () => { state.click!({ latLng: { lat: () => 0.6, lng: () => 0 } }); });
    expect(screen.getByLabelText('Selected latitude').textContent).toBe('0.6');
    expect(getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Post without funds' }));
    await waitFor(() => expect(state.saveResult).toHaveBeenCalledWith(expect.stringContaining('Allow location access')));
    expect(state.upload).not.toHaveBeenCalled();
    expect(state.inserts).not.toHaveBeenCalled();
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
  expect(window.location.search).toBe('');
});

it('does not let delayed startup GPS override a user-selected search area', async () => {
  let locate!: PositionCallback;
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (success: PositionCallback) => { locate = success; } } });
  render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  await waitFor(() => expect(state.click).toBeTruthy());
  fireEvent.click(screen.getAllByRole('button', { name: 'Choose map area' }).at(-1)!);
  expect(state.fitBounds).toHaveBeenCalledWith({north:2,south:0,west:1,east:3},60);
  await act(async () => locate({coords:{latitude:50,longitude:50},timestamp:Date.now()} as GeolocationPosition));
  expect(state.panTo).not.toHaveBeenCalled();
});

it('opens an account report even when it is absent from discovery results', async () => {
  state.published = true;
  render(<MapExperience initialReports={[]} initialUserId="test-user" googleMapsKey="fixture" googleMapsMapId="fixture" initialError="" />);
  fireEvent.click(screen.getByRole('button', { name: 'Open report from history' }));
  expect((await screen.findByLabelText('Linked report')).textContent).toBe('Test bottles');
});
