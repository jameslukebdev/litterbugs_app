// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PlaceSearch } from './place-search';
const api = vi.hoisted(() => ({search:vi.fn(),resolve:vi.fn()}));
vi.mock('@/lib/place-search',()=>({searchPlaces:api.search,resolvePlace:api.resolve}));
const place={id:'address',label:'Nairobi, Kenya',subtitle:'Address / area center · no boundary',latitude:-1.28,longitude:36.8,bounds:{north:-1.1,south:-1.4,west:36.6,east:37}};
beforeEach(()=>vi.resetAllMocks());afterEach(cleanup);
it('selects a worldwide center without inventing a boundary',async()=>{
 const onSelect=vi.fn();const geocode=vi.fn().mockResolvedValue([place]);
 render(<PlaceSearch selected={null} onSelect={onSelect} onClear={vi.fn()} geocode={geocode}/>);
 fireEvent.change(screen.getByLabelText('City or address'),{target:{value:'Nairobi Kenya'}});
 fireEvent.click(screen.getByRole('button',{name:'Search'}));
 fireEvent.click(await screen.findByRole('option',{name:/Nairobi, Kenya/}));
 await waitFor(()=>expect(onSelect).toHaveBeenCalledWith(place));expect(onSelect.mock.calls[0][0].geometry).toBeUndefined();
});
it('ignores an older address response after the query changes',async()=>{
 let resolve!: (value:unknown)=>void;
 const geocode=vi.fn(()=>new Promise(resolvePromise=>{resolve=resolvePromise}));
 render(<PlaceSearch selected={null} onSelect={vi.fn()} onClear={vi.fn()} geocode={geocode as never}/>);
 fireEvent.change(screen.getByLabelText('City or address'),{target:{value:'Nairobi'}});
 fireEvent.click(screen.getByRole('button',{name:'Search'}));
 fireEvent.change(screen.getByLabelText('City or address'),{target:{value:'Bangkok'}});
 await act(async()=>resolve([place]));expect(screen.queryByText('Nairobi, Kenya')).toBeNull();
});
it('keeps the previous place when town boundary resolution fails',async()=>{
 api.search.mockResolvedValue([{id:'town',label:'Boone, NC',subtitle:'U.S. town and surrounding area'}]);api.resolve.mockRejectedValue(new Error('Offline'));
 const onSelect=vi.fn();render(<PlaceSearch selected={place} onSelect={onSelect} onClear={vi.fn()} geocode={vi.fn()}/>);
 fireEvent.change(screen.getByLabelText('City or address'),{target:{value:'Boone NC'}});
 fireEvent.click(screen.getByRole('button',{name:'Search'}));
 fireEvent.click(await screen.findByRole('option',{name:/Boone, NC/}));
 await screen.findByText(/The area could not be loaded/);expect(onSelect).not.toHaveBeenCalled();expect(screen.getByPlaceholderText('Nairobi, Kenya')).toBeTruthy();
});
it('finds worldwide and address results in the default search without requiring a mode change', async () => {
 api.search.mockResolvedValue([]);
 const geocode=vi.fn().mockResolvedValue([place]);
 render(<PlaceSearch selected={null} onSelect={vi.fn()} onClear={vi.fn()} geocode={geocode}/>);
 fireEvent.change(screen.getByLabelText('City or address'),{target:{value:'Nairobi, Kenya'}});
 fireEvent.click(screen.getByRole('button',{name:'Search'}));
 expect(await screen.findByRole('option',{name:/Nairobi, Kenya/})).toBeTruthy();
 expect(geocode).toHaveBeenCalledWith('Nairobi, Kenya');
});
it('preserves available results and explains a partial provider failure', async () => {
 api.search.mockRejectedValue(new Error('Town service unavailable'));
 render(<PlaceSearch selected={null} onSelect={vi.fn()} onClear={vi.fn()} geocode={vi.fn().mockResolvedValue([place])}/>);
 fireEvent.change(screen.getByLabelText('City or address'),{target:{value:'Nairobi'}});
 fireEvent.click(screen.getByRole('button',{name:'Search'}));
 expect(await screen.findByRole('option',{name:/Nairobi, Kenya/})).toBeTruthy();
 expect(screen.getByText(/Some locations could not load/)).toBeTruthy();
});
it('retains completed search results when another provider times out', async () => {
 vi.useFakeTimers();
 try {
  api.search.mockImplementation(()=>new Promise(()=>{}));
  render(<PlaceSearch selected={null} onSelect={vi.fn()} onClear={vi.fn()} geocode={vi.fn().mockResolvedValue([place])}/>);
  fireEvent.change(screen.getByLabelText('City or address'),{target:{value:'Nairobi'}});
  fireEvent.click(screen.getByRole('button',{name:'Search'}));
  await act(async()=>{await vi.advanceTimersByTimeAsync(15000)});
  expect(screen.getByRole('option',{name:/Nairobi, Kenya/})).toBeTruthy();
  expect(screen.getByText(/Some locations could not load/)).toBeTruthy();
 } finally {vi.useRealTimers()}
});

it('shows debounced suggestions while typing, removes search options, and selects with the keyboard', async () => {
 vi.useFakeTimers();
 try {
  api.search.mockResolvedValue([]);
  const onSelect=vi.fn(); const geocode=vi.fn().mockResolvedValue([place]);
  render(<PlaceSearch selected={null} onSelect={onSelect} onClear={vi.fn()} geocode={geocode}/>);
  const input=screen.getByRole('combobox');
  expect(screen.queryByText('Search options')).toBeNull();
  fireEvent.change(input,{target:{value:'Nai'}});
  await act(async()=>{await vi.advanceTimersByTimeAsync(150)});
  fireEvent.change(input,{target:{value:'Nairobi'}});
  await act(async()=>{await vi.advanceTimersByTimeAsync(300)});
  expect(geocode).toHaveBeenCalledTimes(1);
  expect(geocode).toHaveBeenCalledWith('Nairobi');
  expect(input.getAttribute('aria-expanded')).toBe('true');
  fireEvent.keyDown(input,{key:'ArrowDown'});
  expect(screen.getByRole('option').getAttribute('aria-selected')).toBe('true');
  fireEvent.submit(input.closest('form')!);
  await act(async()=>{});
  expect(onSelect).toHaveBeenCalledWith(place);
  expect(input.getAttribute('aria-expanded')).toBe('false');
 } finally {vi.useRealTimers()}
});
it('keeps suggestions closed after Escape cancels a pending debounce', async () => {
 vi.useFakeTimers();
 try {
  const geocode=vi.fn().mockResolvedValue([place]);
  render(<PlaceSearch selected={null} onSelect={vi.fn()} onClear={vi.fn()} geocode={geocode}/>);
  const input=screen.getByRole('combobox');
  fireEvent.change(input,{target:{value:'Nairobi'}});
  fireEvent.keyDown(input,{key:'Escape'});
  await act(async()=>{await vi.advanceTimersByTimeAsync(500)});
  expect(geocode).not.toHaveBeenCalled();
  expect(input.getAttribute('aria-expanded')).toBe('false');
 } finally {vi.useRealTimers()}
});
it('shows completed suggestions immediately while the other provider is still pending', async () => {
 api.search.mockImplementation(()=>new Promise(()=>{}));
 render(<PlaceSearch selected={null} onSelect={vi.fn()} onClear={vi.fn()} geocode={vi.fn().mockResolvedValue([place])}/>);
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'Nairobi'}});
 expect(await screen.findByRole('option',{name:/Nairobi, Kenya/})).toBeTruthy();
});
