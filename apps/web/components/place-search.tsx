'use client';

import { useEffect, useRef, useState } from 'react';
import { resolvePlace, searchPlaces, type TownResult } from '@/lib/place-search';
import type { SearchPlace } from '@/lib/place-geography';

export function PlaceSearch({ selected, onSelect, onClear, geocode, disabled = false }: { selected: SearchPlace | null; onSelect: (place: SearchPlace) => void; onClear: () => void; geocode: (text: string) => Promise<SearchPlace[]>; disabled?: boolean }) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<Array<TownResult | SearchPlace>>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current++; request.current?.abort(); }, []);
  function invalidate() { sequence.current++; request.current?.abort(); setBusy(false); }
  async function search(address: boolean) {
    if (!text.trim()) return;
    invalidate();const seq = sequence.current;const controller = new AbortController();request.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 15000);
    setBusy(true);setMessage('');setResults([]);
    try {
      const found = await Promise.race([
        address ? geocode(text.trim()) : searchPlaces(text.trim(), { signal: controller.signal }),
        new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('Search timed out')), { once: true })),
      ]);
      if (seq !== sequence.current) return;
      setResults(found);
      if (!found.length) setMessage(address ? 'No location found. Try a city and country or a full address.' : 'No U.S. town found. Try Address / worldwide.');
    } catch {
      if (seq === sequence.current) setMessage(address ? 'Address search could not load. Please try again.' : 'Town search could not load. Retry or use Address / worldwide.');
    } finally { window.clearTimeout(timer); if (seq === sequence.current) setBusy(false); }
  }
  async function choose(place: TownResult | SearchPlace) {
    invalidate();const seq = sequence.current;const controller = new AbortController();request.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 15000);setBusy(true);setMessage('');
    try {
      const resolved = 'bounds' in place ? place : await resolvePlace(place, { signal: controller.signal });
      if (seq !== sequence.current) return;
      if (controller.signal.aborted) throw new Error('Area search timed out');
      onSelect(resolved);setResults([]);setText('');
    } catch { if (seq === sequence.current) setMessage('The area could not be loaded. Try selecting it again.'); }
    finally { window.clearTimeout(timer); if (seq === sequence.current) setBusy(false); }
  }
  return <section className="place-search" aria-label="Find a city or address">
    <form onSubmit={event => { event.preventDefault(); void search(false); }}>
      <label htmlFor="place-search-input">City or address</label>
      <div className="place-search-input-row"><input id="place-search-input" type="search" maxLength={120} placeholder="City, state or country" value={text} disabled={disabled} onChange={event => { invalidate(); setText(event.target.value); setResults([]); setMessage(''); }} /><button className="primary-button" disabled={disabled || busy || text.trim().length < 2}>Find U.S. town</button></div>
      <button className="place-address-button" type="button" disabled={disabled || busy || !text.trim()} onClick={() => void search(true)}>Address / worldwide</button>
    </form>
    {busy && <p role="status">Searching…</p>}
    {message && <p role="status">{message}</p>}
    {results.length > 0 && <ul className="place-search-results">{results.map(place => <li key={place.id}><button disabled={busy} onClick={() => void choose(place)}><strong>{place.label}</strong><span>{place.subtitle}</span></button></li>)}</ul>}
    {selected && <div className="selected-place"><div><strong>{selected.label}</strong><small>{selected.subtitle}</small></div><button type="button" onClick={() => { invalidate(); setResults([]); setMessage(''); onClear(); }}>Clear area</button></div>}
  </section>;
}
