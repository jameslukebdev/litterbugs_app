// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PlaceSearch } from './place-search';
const api = vi.hoisted(() => ({ search: vi.fn(), reset: vi.fn() }));
vi.mock('@/lib/location-suggestions', () => ({ createLocationSearch: () => api }));
const place = { id: 'nairobi', label: 'Nairobi, Kenya', subtitle: 'City / town', latitude: -1.28, longitude: 36.8, bounds: { north: -1.1, south: -1.4, west: 36.6, east: 37 } };
const suggestion = () => ({ ...place, resolve: vi.fn().mockResolvedValue(place) });
beforeEach(() => { vi.resetAllMocks(); api.search.mockResolvedValue([suggestion()]); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('selects a worldwide city without inventing a boundary or labelling it an address', async () => {
  const onSelect = vi.fn();
  render(<PlaceSearch selected={null} onSelect={onSelect} onClear={vi.fn()} />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Nairobi Kenya' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  const option = await screen.findByRole('option', { name: /Nairobi, Kenya/ });
  expect(screen.getByAltText('Powered by Google')).toBeTruthy();
  fireEvent.click(option);
  await waitFor(() => expect(onSelect).toHaveBeenCalledWith(place));
  expect(onSelect.mock.calls[0][0].geometry).toBeUndefined();
});

it('ignores an older response after the query changes', async () => {
  let resolve!: (value: unknown) => void;
  api.search.mockImplementation(() => new Promise(done => { resolve = done; }));
  render(<PlaceSearch selected={null} onSelect={vi.fn()} onClear={vi.fn()} />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Nairobi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Bangkok' } });
  await act(async () => resolve([suggestion()]));
  expect(screen.queryByRole('option')).toBeNull();
});

it('retains the selected place when opening a suggestion fails', async () => {
  api.search.mockResolvedValue([{ ...place, resolve: vi.fn().mockRejectedValue(new Error('Offline')) }]);
  const onSelect = vi.fn();
  render(<PlaceSearch selected={place} onSelect={onSelect} onClear={vi.fn()} />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Nairobi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  fireEvent.click(await screen.findByRole('option'));
  await screen.findByText(/The area could not be loaded/);
  expect(onSelect).not.toHaveBeenCalled();
  expect(screen.getByPlaceholderText(place.label)).toBeTruthy();
});

it('does not silently choose the first ambiguous result on Enter', async () => {
  const onSelect = vi.fn();
  render(<PlaceSearch selected={null} onSelect={onSelect} onClear={vi.fn()} />);
  const input = screen.getByRole('combobox');
  fireEvent.change(input, { target: { value: 'Nairobi' } });
  fireEvent.submit(input.closest('form')!);
  await screen.findByRole('option');
  fireEvent.submit(input.closest('form')!);
  expect(onSelect).not.toHaveBeenCalled();
  expect(screen.getByText('Choose a location below.')).toBeTruthy();
  fireEvent.submit(input.closest('form')!);
  await waitFor(() => expect(onSelect).toHaveBeenCalledWith(place));
});

it('debounces typing and chooses the highlighted result with the keyboard', async () => {
  vi.useFakeTimers();
  const onSelect = vi.fn();
  const bias = { latitude: 36, longitude: -81 };
  render(<PlaceSearch selected={null} onSelect={onSelect} onClear={vi.fn()} bias={bias} />);
  const input = screen.getByRole('combobox');
  fireEvent.change(input, { target: { value: 'Nai' } });
  await act(async () => { await vi.advanceTimersByTimeAsync(150); });
  fireEvent.change(input, { target: { value: 'Nairobi' } });
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(api.search).toHaveBeenCalledTimes(1);
  expect(api.search).toHaveBeenCalledWith('Nairobi', bias);
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.submit(input.closest('form')!);
  await act(async () => {});
  expect(onSelect).toHaveBeenCalledWith(place);
  expect(input.getAttribute('aria-expanded')).toBe('false');
});

it('keeps suggestions closed after Escape cancels a pending debounce', async () => {
  vi.useFakeTimers();
  render(<PlaceSearch selected={null} onSelect={vi.fn()} onClear={vi.fn()} />);
  const input = screen.getByRole('combobox');
  fireEvent.change(input, { target: { value: 'Nairobi' } });
  fireEvent.keyDown(input, { key: 'Escape' });
  await act(async () => { await vi.advanceTimersByTimeAsync(500); });
  expect(api.search).not.toHaveBeenCalled();
  expect(input.getAttribute('aria-expanded')).toBe('false');
});

it('distinguishes a search error from a location with no matches', async () => {
  api.search.mockRejectedValue(new Error('Offline'));
  render(<PlaceSearch selected={null} onSelect={vi.fn()} onClear={vi.fn()} />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Nairobi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  await screen.findByText('Location search could not load. Please try again.');
  expect(screen.queryByText(/No location found/)).toBeNull();
});
