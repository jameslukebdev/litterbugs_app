// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MappableReport } from '@litterbugs/report-contract';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReportBrowser } from './report-browser';
import { DEFAULT_DISCOVERY_FILTERS, type DiscoveryFilters } from '@/lib/report-discovery';

const report: MappableReport = {
  is_published: true,
  cancelled_at: null,
  cleanup_state: 'available',
  created_at: '2026-08-26T00:15:00.000Z',
  expired_at: null,
  expires_at: '2026-09-25T12:00:00.000Z',
  funded_amount_cents: 12500,
  funding_eligibility: 'eligible',
  funding_frozen_at: null,
  funding_hold_reason: null,
  funding_locked_at: null,
  id: 'report-id',
  is_sample: false,
  latitude: 36.21,
  litter_types: ['Bottles'],
  longitude: -81.67,
  notes_other: null,
  notes_presets: null,
  original_photo_reviewed_at: null,
  photo_paths: null,
  renewal_decision_due_at: null,
  renewal_status: 'active',
  severity: 'High',
  status: 'active',
  title: 'Roadside bottles',
  types: null,
  user_id: 'user-id',
};

afterEach(() => { cleanup(); sessionStorage.clear(); window.history.replaceState(null, '', '/'); });

describe('ReportBrowser', () => {
  it('makes live reports and the cleaner reward discoverable', () => {
    const onSelect = vi.fn();
    render(<ReportBrowser reports={[report]} open onToggle={vi.fn()} onSelect={onSelect} />);

    expect(screen.getByText('Map')).toBeTruthy();
    expect(document.querySelectorAll('.report-card-container')).toHaveLength(1);
    expect(screen.getByText('Roadside bottles')).toBeTruthy();
    expect(screen.getByText('Pays $125')).toBeTruthy();
    expect(screen.getByText(/(?:day|hr|min).*ago|Just now/)).toBeTruthy();
    expect(screen.getByText('No photo yet')).toBeTruthy();
    expect(screen.getAllByText('Available')[1]).toBeTruthy();
    expect(screen.getByText('Bottles')).toBeTruthy();
    expect(screen.getAllByText('High')[0]).toBeTruthy();
    expect(document.querySelector('.report-result-photo')).toBeTruthy();

    fireEvent.click(screen.getByRole('link', { name: /roadside bottles/i }));
    expect(onSelect).toHaveBeenCalledWith(report);
  });

  it('uses a title-first dense summary and synchronizes preview state', () => {
    const onPreviewReport = vi.fn();
    render(
      <ReportBrowser
        reports={[{ ...report, litter_types: ['Bottles', 'Cans'], notes_presets: ['Broken glass'] }]}
        open
        onToggle={vi.fn()}
        onSelect={vi.fn()}
        onPreviewReport={onPreviewReport}
        previewedReportId={report.id}
      />,
    );

    const card = screen.getByRole('link', { name: /roadside bottles/i });
    const title = screen.getByText('Roadside bottles');
    const reward = screen.getByText('Pays $125');

    expect(title.compareDocumentPosition(reward) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Bottles · Cans · Broken glass')).toBeTruthy();
    expect(card.classList.contains('report-result-previewed')).toBe(true);

    fireEvent.pointerEnter(card);
    fireEvent.pointerLeave(card);
    fireEvent.focus(card);
    fireEvent.blur(card);
    expect(onPreviewReport).toHaveBeenNthCalledWith(1, report.id);
    expect(onPreviewReport).toHaveBeenNthCalledWith(2, null);
    expect(onPreviewReport).toHaveBeenNthCalledWith(3, report.id);
    expect(onPreviewReport).toHaveBeenNthCalledWith(4, null);
  });

  it('uses a cached, right-sized image for a photographed report card', () => {
    render(<ReportBrowser reports={[{ ...report, photo_paths: ['user/report/photo.jpg'] }]} open onToggle={vi.fn()} onSelect={vi.fn()} />);

    const image = document.querySelector('.report-result-photo img');
    expect(image?.getAttribute('src')).toBe('/api/report-photo?path=user%2Freport%2Fphoto.jpg&variant=card');
    expect(image?.getAttribute('fetchpriority')).toBe('high');
  });

  it('defers hidden report photos and prioritizes them when the list opens', () => {
    const props = { reports: [{ ...report, photo_paths: ['user/report/photo.jpg'] }], onToggle: vi.fn(), onSelect: vi.fn() };
    const view = render(<ReportBrowser {...props} open={false} />);
    const image = document.querySelector('.report-result-photo img');
    expect(image?.getAttribute('loading')).toBe('lazy');
    expect(image?.getAttribute('fetchpriority')).toBe('auto');
    view.rerender(<ReportBrowser {...props} open />);
    expect(document.querySelector('.report-result-photo img')).toBe(image);
    expect(image?.getAttribute('loading')).toBe('eager');
    expect(image?.getAttribute('fetchpriority')).toBe('high');
  });

  it('preloads the optimized detail image when a photographed card is explored', () => {
    const originalImage = globalThis.Image;
    const sources: string[] = [];
    class MockImage {
      decoding = '';
      set src(value: string) { sources.push(value); }
    }
    globalThis.Image = MockImage as unknown as typeof Image;

    render(<ReportBrowser reports={[{ ...report, photo_paths: ['user/report/preload.jpg'] }]} open onToggle={vi.fn()} onSelect={vi.fn()} />);
    fireEvent.pointerEnter(screen.getByRole('link', { name: /roadside bottles/i }));

    expect(sources).toContain('/api/report-photo?path=user%2Freport%2Fpreload.jpg&variant=detail');
    globalThis.Image = originalImage;
  });

  it('makes favorite and hidden preferences discoverable and reversible', () => {
    const hiddenReport = { ...report, id: 'hidden-report', title: 'Hidden trail report' };
    render(
      <ReportBrowser
        reports={[report, hiddenReport]}
        open
        onToggle={vi.fn()}
        onSelect={vi.fn()}
        favoriteReportIds={new Set([report.id])}
        hiddenReportIds={new Set([hiddenReport.id])}
      />,
    );

    expect(screen.queryByText('Hidden trail report')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Favorites' }));
    expect(screen.getByText('Roadside bottles')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Hidden' }));
    expect(screen.getByText('Hidden trail report')).toBeTruthy();
    expect(screen.queryByText('Roadside bottles')).toBeNull();
  });

  it('filters and sorts reports while keeping workflow state separate from reward', () => {
    const volunteer = {
      ...report,
      id: 'volunteer-report',
      funded_amount_cents: 0,
      severity: 'Low',
      title: 'Volunteer park cleanup',
    };
    const claimed = {
      ...report,
      id: 'claimed-report',
      cleanup_state: 'claimed',
      funded_amount_cents: 3500,
      title: 'Claimed cleanup',
    };
    const onVisibleReportsChange = vi.fn();

    render(
      <ReportBrowser
        reports={[volunteer, claimed, report]}
        open
        onToggle={vi.fn()}
        onSelect={vi.fn()}
        onVisibleReportsChange={onVisibleReportsChange}
      />,
    );

    expect(document.querySelectorAll('.report-card-container')).toHaveLength(3);
    expect(screen.getByText('Claimed cleanup')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Rewarded' }));
    expect(document.querySelectorAll('.report-card-container')).toHaveLength(1);
    expect(screen.getByText('Pays $125')).toBeTruthy();
    expect(screen.queryByText('Volunteer park cleanup')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'In progress' }));
    expect(screen.getByText('Claimed cleanup')).toBeTruthy();
    expect(screen.getByText('Pays $35')).toBeTruthy();
    expect(document.querySelector('.report-result-workflow')?.textContent).toBe('In progress');
    expect(onVisibleReportsChange).toHaveBeenCalled();
  });
});


it('shows completed cleanups without presenting their old expiration as an upcoming deadline', () => {
  render(<ReportBrowser reports={[{ ...report, cleanup_state: 'completed', funded_amount_cents: 0, completedRewardCents: 12500, expires_at: '2020-01-01T00:00:00Z' }]} open onToggle={vi.fn()} onSelect={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Completed' }));
  expect(document.querySelectorAll('.report-card-container')).toHaveLength(1);
  expect(screen.getByText('Cleanup complete')).toBeTruthy();
  expect(screen.getByText('$125 funded cleanup')).toBeTruthy();
  expect(screen.queryByText(/Ends /)).toBeNull();
});
it('includes photos-under-review and changes-requested cleanups in progress', () => {
  render(<ReportBrowser reports={[{ ...report, cleanup_state: 'completion_submitted' }, { ...report, id: 'changes', title: 'Changes cleanup', cleanup_state: 'changes_requested' }]} open onToggle={vi.fn()} onSelect={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'In progress' }));
  expect(document.querySelectorAll('.report-card-container')).toHaveLength(2);
  expect(screen.getByText('Changes cleanup')).toBeTruthy();
});

it('combines status, reward, severity, text, and radius independently', async () => {
  const onDiscoveryFiltersChange = vi.fn();
  render(<ReportBrowser reports={[
    report,
    { ...report, id: 'low', title: 'Low bottles', severity: 'Low' },
    { ...report, id: 'unfunded', title: 'Unfunded bottles', funded_amount_cents: 0 },
    { ...report, id: 'far', title: 'Far bottles', latitude: 40 },
    { ...report, id: 'other', title: 'Cans' },
  ]} mapCenter={{ latitude: 36.21, longitude: -81.67 }} open onToggle={vi.fn()} onSelect={vi.fn()} onDiscoveryFiltersChange={onDiscoveryFiltersChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Search and filters' }));
  const group = (name: string) => within(screen.getByRole('group', { name }));
  fireEvent.click(group('Cleanup status').getByRole('radio', { name: 'Needs a cleanup' }));
  fireEvent.click(group('Cleanup fund').getByRole('radio', { name: 'Has a fund' }));
  fireEvent.click(group('Priority').getByRole('radio', { name: 'High' }));
  fireEvent.click(group('Distance from map center').getByRole('radio', { name: '5 mi' }));
  fireEvent.change(screen.getByLabelText('Search report titles and notes'), { target: { value: 'bottles' } });
  fireEvent.click(screen.getByRole('button', { name: 'Show results' }));
  expect(document.querySelectorAll('.report-card-container')).toHaveLength(1);
  await waitFor(() => expect(onDiscoveryFiltersChange).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'available', funding: 'funded', severity: 'high', radius: 5, query: 'bottles' })));
  expect(screen.queryByText('Far bottles')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Search and filters' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
  fireEvent.click(screen.getByRole('button', { name: 'Show results' }));
  expect(document.querySelectorAll('.report-card-container')).toHaveLength(5);
});


it('keeps all 1,000 map matches while rendering results in accessible batches', async () => {
  const onVisibleReportsChange = vi.fn();
  const reports = Array.from({ length: 1000 }, (_, index) => ({ ...report, id: `report-${index}`, title: `Cleanup ${index}` }));
  render(<ReportBrowser reports={reports} open onToggle={vi.fn()} onSelect={vi.fn()} onVisibleReportsChange={onVisibleReportsChange} />);
  await waitFor(() => expect(document.querySelectorAll('.report-result')).toHaveLength(50));
  expect(onVisibleReportsChange).toHaveBeenLastCalledWith(reports);
  fireEvent.click(screen.getByRole('button', { name: 'Show more reports (50 of 1000)' }));
  expect(document.querySelectorAll('.report-result')).toHaveLength(100);
  fireEvent.click(screen.getByRole('button', { name: 'Completed' }));
  expect(screen.getByText('No reports match your filters')).toBeTruthy();
});

it('restores expanded results when URL filters match device memory regardless of key order', async () => {
  window.history.replaceState(null, '', '/?browse=1');
  sessionStorage.setItem('litterbugs.results.v1', JSON.stringify({
    filters: { status: 'all', funding: 'all', severity: 'all', radius: 0, query: '', scope: 'all' },
    sort: 'newest', scroll: 120, displayLimit: 100,
  }));
  render(<ReportBrowser reports={Array.from({ length: 120 }, (_, index) => ({ ...report, id: `restored-${index}` }))} open onToggle={vi.fn()} onSelect={vi.fn()} />);
  await waitFor(() => expect(document.querySelectorAll('.report-result')).toHaveLength(100));
  expect(screen.getByRole('button', { name: 'Show more reports (100 of 120)' })).toBeTruthy();
});
it('retries a failed thumbnail without opening the report and resets when its photo changes', async () => {
 const onSelect=vi.fn();
 const props={reports:[{...report,photo_paths:['user/report/one.jpg']}],open:true,onToggle:vi.fn(),onSelect};
 const view=render(<ReportBrowser {...props}/>);
 fireEvent.error(view.container.querySelector('.report-result-photo img')!);
 fireEvent.click(screen.getByRole('button',{name:/Retry photo for/}));
 expect(view.container.querySelector('.report-result-photo img')?.getAttribute('src')).toContain('retry=1');
 expect(onSelect).not.toHaveBeenCalled();
 expect(screen.queryByRole('button',{name:/Retry photo for/})).toBeNull();
 fireEvent.error(view.container.querySelector('.report-result-photo img')!);
 view.rerender(<ReportBrowser {...props} reports={[{...report,photo_paths:['user/report/replaced.jpg']}]}/>);
 expect(view.container.querySelector('.report-result-photo img')?.getAttribute('src')).toContain('replaced.jpg');
 expect(screen.queryByRole('button',{name:/Retry photo for/})).toBeNull();
});

it('preserves quick-filter positions and horizontal scroll after selection', () => {
  render(<ReportBrowser reports={[report]} open onToggle={vi.fn()} onSelect={vi.fn()} />);
  const strip = document.querySelector('.report-browser-filters') as HTMLElement;
  const order = Array.from(strip.querySelectorAll('button')).map(button => button.textContent);
  strip.scrollLeft = 160;
  fireEvent.click(screen.getByRole('button', { name: 'Completed' }));
  expect(Array.from(strip.querySelectorAll('button')).map(button => button.textContent)).toEqual(order);
  expect(strip.scrollLeft).toBe(160);
});

it('applies explicit filters when a navigation link reopens the current map', async () => {
  const initialSearch = '?view=reports&browse=1&status=progress';
  window.history.replaceState(null, '', `/map${initialSearch}`);
  const props = { reports: [report], open: true, onToggle: vi.fn(), onSelect: vi.fn() };
  const view = render(<ReportBrowser {...props} navigationSearch={initialSearch} />);
  const inProgress = screen.getByRole('button', { name: 'In progress' });
  await waitFor(() => expect(inProgress.getAttribute('aria-pressed')).toBe('true'));

  const mapSearch = '?view=map&browse=1&status=available';
  window.history.replaceState(null, '', `/map${mapSearch}`);
  view.rerender(<ReportBrowser {...props} navigationSearch={mapSearch} />);
  const available = screen.getByRole('button', { name: 'Available' });
  await waitFor(() => expect(available.getAttribute('aria-pressed')).toBe('true'));
  expect(inProgress.getAttribute('aria-pressed')).toBe('false');
});

it('starts a shared report unfiltered instead of silently restoring unrelated session filters', async () => {
  window.history.replaceState(null, '', '/map?report=shared&intent=fund#map=36,-81,12');
  sessionStorage.setItem('litterbugs.results.v1', JSON.stringify({
    filters: { status: 'completed', funding: 'all', severity: 'all', radius: 0, query: '', scope: 'all' },
    sort: 'newest', scroll: 0,
  }));
  render(<ReportBrowser reports={[report]} open onToggle={vi.fn()} onSelect={vi.fn()} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'All reports' }).getAttribute('aria-pressed')).toBe('true'));
  expect(screen.getByText('Roadside bottles')).toBeTruthy();
  expect(window.location.search).toBe('?report=shared&intent=fund');
  fireEvent.click(screen.getByRole('button', { name: 'Available' }));
  const query = new URLSearchParams(window.location.search);
  expect(query.get('browse')).toBe('1');
  expect(query.get('status')).toBe('available');
  expect(query.get('report')).toBe('shared');
  expect(window.location.hash).toBe('#map=36,-81,12');
});

it('lets visitors include volunteer cleanups without clearing their area or other filters', async () => {
  window.history.replaceState(null, '', '/map?area=boone&browse=1&status=available&funding=funded&severity=high');
  render(<ReportBrowser reports={[{ ...report, funded_amount_cents: 0 }]} open onToggle={vi.fn()} onSelect={vi.fn()} />);
  await screen.findByText('No rewarded cleanups match your search');
  fireEvent.click(screen.getByRole('button', { name: 'Include volunteer cleanups' }));
  expect(await screen.findByText('Roadside bottles')).toBeTruthy();
  const params = new URLSearchParams(window.location.search);
  expect(params.get('area')).toBe('boone');
  expect(params.get('severity')).toBe('high');
  expect(params.get('funding')).toBeNull();
});

it('offers location search and widening inside an unfiltered empty result', async () => {
  const onWidenArea = vi.fn();
  render(<ReportBrowser reports={[]} open onToggle={vi.fn()} onSelect={vi.fn()} onWidenArea={onWidenArea}
    emptyPlaceSearch={<label>Search another location<input /></label>} />);
  expect(await screen.findByRole('heading', { name: 'No reports in this map area' })).toBeTruthy();
  expect(screen.getByRole('textbox', { name: 'Search another location' })).toBeTruthy();
  expect(screen.getByText('or', { exact: true })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Search a wider area' }));
  expect(onWidenArea).toHaveBeenCalledOnce();
});

it('removes a distance limit when widening while keeping the other filters', async () => {
  window.history.replaceState(null, '', '/map?browse=1&status=available&severity=high&radius=5');
  render(<ReportBrowser reports={[]} open onToggle={vi.fn()} onSelect={vi.fn()} />);
  await screen.findByRole('heading', { name: 'No reports match your filters' });
  fireEvent.click(screen.getByRole('button', { name: 'Search a wider area' }));
  const query = new URLSearchParams(window.location.search);
  expect(query.get('radius')).toBeNull();
  expect(query.get('status')).toBe('available');
  expect(query.get('severity')).toBe('high');
});

it('waits for results for the restored filters and keeps those cards visible during a map refresh', async () => {
  window.history.replaceState(null, '', '/map?browse=1&status=available');
  const onDiscoveryFiltersChange = vi.fn();
  const props = {
    reports: [report, { ...report, id: 'done', title: 'Completed bottles', cleanup_state: 'completed' as const }],
    open: true,
    onToggle: vi.fn(),
    onSelect: vi.fn(),
    onDiscoveryFiltersChange,
  };
  const view = render(<ReportBrowser {...props} resultFilters={null} />);
  expect(screen.getByRole('status', { name: 'Loading reports' }).textContent).toBe('');
  expect(screen.queryByText('Completed bottles')).toBeNull();
  await waitFor(() => expect(onDiscoveryFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'available' })));
  const available = onDiscoveryFiltersChange.mock.lastCall![0];
  view.rerender(<ReportBrowser {...props} resultFilters={available} />);
  const card = screen.getByRole('link', { name: /roadside bottles/i });
  view.rerender(<ReportBrowser {...props} resultFilters={available} refreshing />);
  expect(screen.getByRole('link', { name: /roadside bottles/i })).toBe(card);
  expect(screen.queryByRole('status', { name: 'Loading reports' })).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Completed' }));
  expect(screen.queryByText('Completed bottles')).toBeNull();
  const completed = onDiscoveryFiltersChange.mock.lastCall![0];
  view.rerender(<ReportBrowser {...props} resultFilters={completed} />);
  expect(screen.getByRole('link', { name: /completed bottles/i })).toBeTruthy();
  expect(screen.queryByText('Roadside bottles')).toBeNull();
});

it('opens the toolbar dialog with applied filters after Show results, including an empty Hidden scope', async () => {
  const props = { reports: [report], open: true, onToggle: vi.fn(), onSelect: vi.fn() };
  const view = render(<ReportBrowser {...props} filtersRequest={0} />);
  fireEvent.click(screen.getByRole('button', { name: 'Search and filters' }));
  fireEvent.click(within(screen.getByRole('group', { name: 'Saved reports' })).getByRole('radio', { name: 'Hidden' }));
  fireEvent.click(screen.getByRole('button', { name: 'Show results' }));
  expect(screen.getByRole('button', { name: 'Remove Hidden reports filter' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Hidden' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.queryByText('Roadside bottles')).toBeNull();
  view.rerender(<ReportBrowser {...props} filtersRequest={1} />);
  const dialog = await screen.findByRole('dialog', { name: 'Search and filters' });
  expect((within(dialog).getByRole('radio', { name: 'Hidden' }) as HTMLInputElement).checked).toBe(true);
  expect((within(dialog).getByRole('radio', { name: 'Favorites' }) as HTMLInputElement).checked).toBe(false);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove Hidden reports filter' }));
  expect(screen.getByText('Roadside bottles')).toBeTruthy();
  expect(new URLSearchParams(window.location.search).has('scope')).toBe(false);
});

it('keeps Favorites explicit and removable after the last saved favorite disappears', async () => {
  const props = { reports: [report], open: true, onToggle: vi.fn(), onSelect: vi.fn() };
  const view = render(<ReportBrowser {...props} favoriteReportIds={new Set([report.id])} />);
  await waitFor(() => expect(sessionStorage.getItem('litterbugs.results.v1')).toBeTruthy());
  expect(screen.queryByRole('group', { name: 'Active filters' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Favorites' }));
  view.rerender(<ReportBrowser {...props} favoriteReportIds={new Set()} />);
  expect(screen.getByRole('button', { name: 'Favorites' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.queryByText('Roadside bottles')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Remove Favorites filter' }));
  expect(screen.getByText('Roadside bottles')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'All reports' }).getAttribute('aria-pressed')).toBe('true');
});

it.each([
  ['status', 'Remove Cleaned up filter'], ['funding', 'Remove Has a fund filter'],
  ['severity', 'Remove Priority: High filter'], ['radius', 'Remove Within 5 mi of map center filter'],
  ['query', 'Remove Search: bottles filter'], ['scope', 'Remove Favorites filter'],
] as const)('removes only %s, keeping the other filters, map position and report selection', async (key, button) => {
  window.history.replaceState(null, '', '/map?browse=1&view=map&status=completed&funding=funded&severity=high&radius=5&q=bottles&scope=favorites&report=shared#map=36,-81,12');
  const onDiscoveryFiltersChange = vi.fn();
  const allFilters: DiscoveryFilters = { status: 'completed', funding: 'funded', severity: 'high', radius: 5, query: 'bottles', scope: 'favorites' };
  render(<ReportBrowser reports={[]} open onToggle={vi.fn()} onSelect={vi.fn()} onDiscoveryFiltersChange={onDiscoveryFiltersChange} />);
  fireEvent.click(await screen.findByRole('button', { name: button }));
  await waitFor(() => expect(onDiscoveryFiltersChange).toHaveBeenLastCalledWith({ ...allFilters, [key]: DEFAULT_DISCOVERY_FILTERS[key] }));
  expect(new URLSearchParams(window.location.search).get('report')).toBe('shared');
  expect(new URLSearchParams(window.location.search).get('view')).toBe('map');
  expect(window.location.hash).toBe('#map=36,-81,12');
  expect(screen.queryByRole('button', { name: button })).toBeNull();
  expect(within(screen.getByRole('group', { name: 'Active filters' })).getAllByRole('button')).toHaveLength(6);
});

it('clears every applied filter from the active row and restores URL filters on back/forward', async () => {
  const filtered = '/map?browse=1&scope=favorites&severity=high&q=bottles';
  window.history.replaceState(null, '', filtered);
  render(<ReportBrowser reports={[report]} open onToggle={vi.fn()} onSelect={vi.fn()} favoriteReportIds={new Set([report.id])} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Clear all filters' }));
  expect(screen.queryByRole('group', { name: 'Active filters' })).toBeNull();
  expect(screen.getByText('Roadside bottles')).toBeTruthy();
  expect(window.location.search).toBe('?browse=1');
  window.history.replaceState(null, '', filtered);
  fireEvent(window, new PopStateEvent('popstate'));
  expect(await screen.findByRole('button', { name: 'Remove Favorites filter' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Remove Priority: High filter' })).toBeTruthy();
  window.history.replaceState(null, '', '/map');
  fireEvent(window, new PopStateEvent('popstate'));
  await waitFor(() => expect(screen.queryByRole('group', { name: 'Active filters' })).toBeNull());
});

it.each(['favorites', 'hidden'] as const)('does not apply stale %s session filters to a fresh map entry', async scope => {
  sessionStorage.setItem('litterbugs.results.v1', JSON.stringify({ filters: { ...DEFAULT_DISCOVERY_FILTERS, scope }, sort: 'newest', scroll: 0 }));
  window.history.replaceState(null, '', '/map?view=reports');
  const onDiscoveryFiltersChange = vi.fn();
  render(<ReportBrowser reports={[report]} open onToggle={vi.fn()} onSelect={vi.fn()} onDiscoveryFiltersChange={onDiscoveryFiltersChange} />);
  await waitFor(() => expect(onDiscoveryFiltersChange).toHaveBeenLastCalledWith(DEFAULT_DISCOVERY_FILTERS));
  expect(screen.getByText('Roadside bottles')).toBeTruthy();
});

it('keeps dialog edits and Reset unapplied when dismissed, then reopens the actual choices', async () => {
  window.history.replaceState(null, '', '/map?browse=1&severity=high');
  const props = { reports: [report], open: true, onToggle: vi.fn(), onSelect: vi.fn() };
  const view = render(<ReportBrowser {...props} filtersRequest={0} />);
  await screen.findByRole('button', { name: 'Remove Priority: High filter' });
  fireEvent.click(screen.getByRole('button', { name: 'Search and filters' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
  fireEvent.click(within(screen.getByRole('group', { name: 'Saved reports' })).getByRole('radio', { name: 'Favorites' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(window.location.search).toBe('?browse=1&severity=high');
  expect(screen.queryByRole('button', { name: 'Remove Favorites filter' })).toBeNull();
  view.rerender(<ReportBrowser {...props} filtersRequest={1} />);
  const dialog = await screen.findByRole('dialog', { name: 'Search and filters' });
  expect((within(dialog).getByRole('radio', { name: 'High' }) as HTMLInputElement).checked).toBe(true);
  expect((within(within(dialog).getByRole('group', { name: 'Saved reports' })).getByRole('radio', { name: 'All' }) as HTMLInputElement).checked).toBe(true);
});

it('sends the same filtered reports to the map as it renders in the list', async () => {
  const other = { ...report, id: 'other', title: 'Other report' };
  const onVisibleReportsChange = vi.fn();
  render(<ReportBrowser reports={[report, other]} open onToggle={vi.fn()} onSelect={vi.fn()} favoriteReportIds={new Set([report.id])} onVisibleReportsChange={onVisibleReportsChange} />);
  await waitFor(() => expect(onVisibleReportsChange).toHaveBeenLastCalledWith([report, other]));
  fireEvent.click(screen.getByRole('button', { name: 'Favorites' }));
  await waitFor(() => expect(onVisibleReportsChange).toHaveBeenLastCalledWith([report]));
  expect(screen.queryByText('Other report')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Remove Favorites filter' }));
  await waitFor(() => expect(onVisibleReportsChange).toHaveBeenLastCalledWith([report, other]));
  expect(screen.getByText('Other report')).toBeTruthy();
});
