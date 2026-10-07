'use client';

import { IoCloseOutline, IoLocationOutline, IoSearchOutline } from 'react-icons/io5';
import { useEffect, useId, useRef, useState } from 'react';
import { resolvePlace, searchPlaces, type TownResult } from '@/lib/place-search';
import type { SearchPlace } from '@/lib/place-geography';

type Suggestion = TownResult | SearchPlace;

export function PlaceSearch({ selected, onSelect, onClear, geocode, disabled = false }: { selected: SearchPlace | null; onSelect: (place: SearchPlace) => void; onClear: () => void; geocode: (text: string) => Promise<SearchPlace[]>; disabled?: boolean }) {
  const inputId = useId();
  const listId = `${inputId}-suggestions`;
  const container = useRef<HTMLElement>(null);
  const [text, setText] = useState('');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const request = useRef<AbortController | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequence = useRef(0);

  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) {
        sequence.current++; request.current?.abort();
        if (debounce.current) clearTimeout(debounce.current);
        setBusy(false); setOpen(false);
      }
    }
    document.addEventListener('pointerdown', dismiss);
    return () => {
      // Invalidate the latest request, including requests started after this effect mounted.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      sequence.current++;
      request.current?.abort();
      if (debounce.current) clearTimeout(debounce.current);
      document.removeEventListener('pointerdown', dismiss);
    };
  }, []);

  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active, listId, open]);

  function invalidate() {
    sequence.current++;
    request.current?.abort();
    if (debounce.current) clearTimeout(debounce.current);
    setBusy(false);
    setActive(-1);
  }

  async function search(query: string) {
    if (query.trim().length < 2) return;
    invalidate();
    const seq = sequence.current;
    const controller = new AbortController();
    request.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 15000);
    setBusy(true);
    setMessage('');
    setResults([]);
    setOpen(true);
    try {
      // Both providers feed one location picker. Show completed results immediately,
      // so a slow boundary service never holds up an available address result.
      const found: Suggestion[] = [];
      const timeout = new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('Search timed out')), { once: true }));
      const providers = [searchPlaces(query.trim(), { signal: controller.signal }), geocode(query.trim())];
      const responses = await Promise.allSettled(providers.map(async provider => {
        const places = await Promise.race([provider, timeout]);
        if (seq !== sequence.current) return;
        for (const place of places ?? []) {
          if (!found.some(item => item.id === place.id || (
            item.label.split(',')[0].toLowerCase() === place.label.split(',')[0].toLowerCase()
            && Math.abs(item.latitude - place.latitude) < 0.03 && Math.abs(item.longitude - place.longitude) < 0.03
          ))) found.push(place);
        }
        setResults(found.slice(0, 8));
      }));
      if (seq !== sequence.current) return;
      if (responses.some(result => result.status === 'rejected')) {
        setMessage(found.length ? 'Some locations could not load. Choose a result or search again.' : 'Location search could not load. Please try again.');
      } else if (!found.length) setMessage('No location found. Try a city and state or a full address.');
    } finally {
      window.clearTimeout(timer);
      if (seq === sequence.current) setBusy(false);
    }
  }

  async function choose(place: Suggestion) {
    invalidate();
    const seq = sequence.current;
    const controller = new AbortController();
    request.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 15000);
    setBusy(true);
    setMessage('Opening location…');
    try {
      const timeout = new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('Area search timed out')), { once: true }));
      const resolved = await Promise.race(['bounds' in place ? Promise.resolve(place) : resolvePlace(place, { signal: controller.signal }), timeout]);
      if (seq !== sequence.current) return;
      onSelect(resolved);
      setResults([]);
      setText('');
      setMessage('');
      setOpen(false);
    } catch {
      if (seq === sequence.current) setMessage('The area could not be loaded. Try selecting it again.');
    } finally {
      window.clearTimeout(timer);
      if (seq === sequence.current) setBusy(false);
    }
  }

  const showSuggestions = open && (busy || !!message || results.length > 0);
  return <section ref={container} className="place-search" aria-label="Find a city or address" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { invalidate(); setOpen(false); }
  }}>
    <form onSubmit={event => {
      event.preventDefault();
      if (showSuggestions && results.length) void choose(results[active >= 0 ? active : 0]);
      else void search(text);
    }}>
      <label htmlFor={inputId}>City or address</label>
      <div className="place-search-input-row">
        <div className={`place-search-field${selected ? ' has-selected-place' : ''}`}><input id={inputId} type="search" role="combobox" aria-autocomplete="list" aria-expanded={showSuggestions} aria-controls={listId}
          aria-activedescendant={showSuggestions && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off" enterKeyHint="search" maxLength={120} placeholder={selected?.label ?? 'Search city or address'} value={text} disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={event => {
            invalidate();
            const value = event.target.value;
            setText(value); setResults([]); setMessage(''); setOpen(true);
            if (value.trim().length >= 2) debounce.current = setTimeout(() => { void search(value); }, 300);
          }}
          onKeyDown={event => {
            if (event.key === 'Escape') { event.preventDefault(); invalidate(); setOpen(false); }
            if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && results.length) {
              event.preventDefault(); setOpen(true);
              setActive(index => event.key === 'ArrowDown' ? (index + 1) % results.length : (index <= 0 ? results.length - 1 : index - 1));
            }
          }} />
          {selected && <button type="button" className="place-search-clear" aria-label="Clear area" title="Clear area" onClick={() => { invalidate(); setResults([]); setMessage(''); setText(''); setOpen(false); onClear(); }}><IoCloseOutline aria-hidden /></button>}
        </div>
        <button className="primary-button place-search-submit" aria-label="Search" disabled={disabled || text.trim().length < 2}><IoSearchOutline aria-hidden /><span>Search</span></button>
      </div>
    </form>
    {showSuggestions && <div className="place-search-dropdown">
      <p className="place-search-hint">Choose a location to explore</p>
      <ul id={listId} role="listbox" aria-label="Location suggestions" className="place-search-results">
        {results.map((place, index) => <li id={`${listId}-${index}`} role="option" aria-selected={active === index} key={place.id}
          onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => void choose(place)}>
          <IoLocationOutline aria-hidden /><div><strong>{place.label}</strong><span>{'bounds' in place ? 'Move map to this location' : 'Town and surrounding area'}</span></div>
        </li>)}
      </ul>
      {(message || (busy && !results.length)) && <p className="place-search-status" role="status">{message || 'Finding locations…'}</p>}
    </div>}
  </section>;
}
