'use client';

import { trackMapDiscovery } from '@/lib/website-analytics';
import { IoCloseOutline, IoLocationOutline, IoSearchOutline } from 'react-icons/io5';
import { useEffect, useId, useRef, useState } from 'react';
import { createLocationSearch, type LocationSuggestion } from '@/lib/location-suggestions';
import type { Coordinates } from '@litterbugs/report-contract';
import type { SearchPlace } from '@/lib/place-geography';
import styles from './place-search.module.css';

type Suggestion = LocationSuggestion;

export function PlaceSearch({ selected, onSelect, onClear, bias, disabled = false, label, trackingSurface = 'toolbar_search' }: { selected: SearchPlace | null; onSelect: (place: SearchPlace) => void; onClear: () => void; bias?: Coordinates | null; disabled?: boolean; label?: string; trackingSurface?: 'toolbar_search' | 'empty_search' }) {
  const [provider] = useState(createLocationSearch);
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
        setBusy(false); setOpen(false); provider.reset();
      }
    }
    document.addEventListener('pointerdown', dismiss);
    return () => {
      // Invalidate the latest request, including requests started after this effect mounted.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      sequence.current++;
      request.current?.abort(); provider.reset();
      if (debounce.current) clearTimeout(debounce.current);
      document.removeEventListener('pointerdown', dismiss);
    };
  }, [provider]);

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
      const timeout = new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('Search timed out')), { once: true }));
      const places = await Promise.race([provider.search(query.trim(), bias), timeout]);
      if (seq !== sequence.current) return;
      setResults(places);
      if (!places.length) trackMapDiscovery('location_search_empty', { surface: trackingSurface });
      if (!places.length) setMessage('No location found. Try a city and state or a full address.');
    } catch {
      if (seq === sequence.current) { trackMapDiscovery('location_search_failed', { surface: trackingSurface }); setMessage('Location search could not load. Please try again.'); }
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
      const resolved = await Promise.race([place.resolve(), timeout]);
      if (seq !== sequence.current) return;
      trackMapDiscovery('location_selected', { surface: trackingSurface });
      onSelect(resolved);
      setResults([]);
      setText('');
      setMessage('');
      setOpen(false);
    } catch {
      if (seq === sequence.current) { trackMapDiscovery('location_search_failed', { surface: trackingSurface }); setMessage('The area could not be loaded. Try selecting it again.'); }
    } finally {
      window.clearTimeout(timer);
      if (seq === sequence.current) setBusy(false);
    }
  }

  const showSuggestions = open && (busy || !!message || results.length > 0);
  return <section ref={container} className="place-search" aria-label={label ?? 'Find a city or address'} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { invalidate(); provider.reset(); setOpen(false); }
  }}>
    <form onSubmit={event => {
      event.preventDefault();
      if (text.trim().length >= 2) trackMapDiscovery('search_submitted', { surface: trackingSurface });
      if (showSuggestions && active >= 0 && results[active]) void choose(results[active]);
      else if (showSuggestions && results.length) { setActive(0); setMessage('Choose a location below.'); }
      else void search(text);
    }}>
      <label htmlFor={inputId}>{label ?? 'City or address'}</label>
      <div className="place-search-input-row">
        <div className={`place-search-field${selected ? ' has-selected-place' : ''}`}><input id={inputId} type="search" role="combobox" aria-autocomplete="list" aria-expanded={showSuggestions} aria-controls={listId}
          aria-activedescendant={showSuggestions && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off" enterKeyHint="search" maxLength={120} placeholder={selected?.label ?? 'City or address'} value={text} disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={event => {
            invalidate();
            const value = event.target.value;
            setText(value); setResults([]); setMessage(''); setOpen(true);
            if (value.trim().length >= 2) debounce.current = setTimeout(() => { void search(value); }, 300);
          }}
          onKeyDown={event => {
            if (event.key === 'Escape') { event.preventDefault(); invalidate(); provider.reset(); setOpen(false); }
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
      <ul id={listId} role="listbox" aria-label="Location suggestions" className="place-search-results">
        {results.map((place, index) => <li id={`${listId}-${index}`} role="option" aria-selected={active === index} key={place.id}
          onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => void choose(place)}>
          <IoLocationOutline aria-hidden /><div><strong>{place.label}</strong><span>{place.subtitle}</span></div>
        </li>)}
      </ul>
      {/* Google's required attribution also covers pickers outside the map. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {!!results.length && <img className={styles.attribution} src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png" width="120" height="14" alt="Powered by Google" />}
      {(message || (busy && !results.length)) && <p className="place-search-status" role="status">{message || 'Finding locations…'}</p>}
    </div>}
  </section>;
}
