// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_REPORT_DRAFT, type ReportDraft } from '@litterbugs/report-contract';
import { MapExperience } from './map-experience';

const state = vi.hoisted(() => ({
  click: null as null | ((event: unknown) => void),
  published: false,
  lostResponse: false,
  inserts: vi.fn(),
  publish: vi.fn(),
  upload: vi.fn(),
  review: vi.fn(),
  saveResult: vi.fn(),
  journal: undefined as { userId: string; reportId: string; paths: string[] } | undefined,
}));
const report = () => ({ id: 'test-report', title: 'Test bottles', latitude: 0.5, longitude: 0, user_id: 'test-user', is_published: state.published, photo_paths: ['test-user/test-report/photo.jpg'], cleanup_state: 'available', funding_eligibility: 'eligible', renewal_status: 'active' });
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@googlemaps/js-api-loader', () => ({
  setOptions: vi.fn(),
  importLibrary: async (name: string) => name === 'maps' ? { Map: class {
    addListener(_name: string, callback: (event: unknown) => void) { state.click = callback; }
    panTo() {} setZoom() {} getZoom() { return 14; }
  } } : { AdvancedMarkerElement: class {} },
}));
vi.mock('@/components/public-site-header', () => ({ PublicSiteHeader: ({ action }: { action: React.ReactNode }) => action }));
vi.mock('@/components/public-account-action', () => ({ PublicAccountAction: () => null }));
vi.mock('@/components/report-browser', () => ({ ReportBrowser: () => null }));
vi.mock('@/components/report-detail', () => ({ ReportDetail: () => null }));
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
      select: () => chain, eq: () => chain, is: () => chain, or: () => chain, gt: () => chain, order: () => chain,
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
  vi.clearAllMocks(); state.journal = undefined; state.click = null; state.published = false; state.lostResponse = false;
  state.upload.mockResolvedValue('test-user/test-report/photo.jpg');
  state.review.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: 0, longitude: 0 }, timestamp: Date.now() } as GeolocationPosition),
  } });
});
afterEach(cleanup);
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
    fireEvent.click(screen.getByRole('button', { name: 'Keep previous report location' }));
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
