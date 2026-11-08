// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { MappableReport } from '@litterbugs/report-contract';
import { ClosestReportsAction } from './closest-reports-action';
import { MapEmptyState } from './map-empty-state';
const telemetry = vi.hoisted(() => vi.fn());
vi.mock('@/lib/website-analytics', async original => ({ ...await original<object>(), trackMapDiscovery: telemetry }));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });
const result = { report: { id: 'closest', title: 'Bottles by the trail', latitude: 1, longitude: 2 } as MappableReport, miles: 438.7 };
it('shows distance before navigating and changes a radius only after explicit confirmation', async () => {
  const show = vi.fn(); const find = vi.fn().mockResolvedValue(result);
  render(<ClosestReportsAction find={find} onShow={show} radius={5} />);
  expect(find).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Find closest reports' }));
  await screen.findByText('439 miles away');
  expect(show).not.toHaveBeenCalled();
  expect(screen.getByText(/removes your 5-mile distance limit/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'View on map' }));
  expect(show).toHaveBeenCalledWith(result);
  expect(telemetry.mock.calls).toEqual([['closest_requested', { surface: 'closest_reports' }], ['closest_found', { surface: 'closest_reports', distance_bucket: 'over_50' }], ['closest_viewed', { surface: 'closest_reports', distance_bucket: 'over_50' }]]);
  expect(JSON.stringify(telemetry.mock.calls)).not.toMatch(/Bottles|438|latitude|longitude/);
});
it('distinguishes a failed lookup from a genuine empty result', async () => {
  render(<ClosestReportsAction find={vi.fn().mockRejectedValue(new Error('Offline'))} onShow={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Find closest reports' }));
  await screen.findByText('Reports could not load. Please try again.');
  expect(screen.queryByText(/No matching reports/)).toBeNull();
});
it('cancels an in-flight lookup when the viewport or filters change', () => {
  let signal: AbortSignal | undefined;
  const view = render(<ClosestReportsAction find={value => { signal = value; return new Promise(() => {}); }} onShow={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Find closest reports' }));
  view.unmount();
  expect(signal?.aborted).toBe(true);
  expect(telemetry.mock.calls.map(([stage]) => stage)).toEqual(['closest_requested']);
});
it('offers retry for loading errors and never calls them empty maps', () => {
  const retry = vi.fn();
  render(<MapEmptyState error="Offline" filtered={false} closestAction={<button>Find closest reports</button>} onRetry={retry} onFilters={vi.fn()} />);
  expect(screen.getByRole('heading', { name: 'Reports could not be loaded' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Find closest reports' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledOnce();
});

it('records a genuine empty lookup separately from a timeout', async () => {
  const view = render(<ClosestReportsAction find={vi.fn().mockResolvedValue(null)} onShow={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Find closest reports' }));
  await screen.findByText(/No matching reports found/);
  expect(telemetry).toHaveBeenCalledWith('closest_empty', { surface: 'closest_reports' });
  view.unmount(); telemetry.mockClear(); vi.useFakeTimers();
  render(<ClosestReportsAction find={() => new Promise(() => {})} onShow={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Find closest reports' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(15001); });
  expect(telemetry).toHaveBeenCalledWith('closest_failed', { surface: 'closest_reports' });
  expect(telemetry).not.toHaveBeenCalledWith('closest_empty', expect.anything());
});
