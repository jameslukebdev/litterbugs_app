'use client';

/* Map transitions intentionally reload the document so the existing map owns its loader and URL state. */
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { IoLocationOutline, IoArrowForward } from 'react-icons/io5';
import { searchPlaces } from '@/lib/place-search';
import { getGoogleMapsKey } from '@/lib/env';
import styles from './homepage.module.css';

type Location = { id: string; label: string; latitude: number; longitude: number };

async function geocode(text: string): Promise<Location[]> {
  const key = getGoogleMapsKey();
  if (!key) return [];
  const { importLibrary, setOptions } = await import('@googlemaps/js-api-loader');
  if (typeof google === 'undefined' || !google.maps?.importLibrary) {
    setOptions({ key, v: 'weekly', authReferrerPolicy: 'origin' });
  }
  const { Geocoder } = await importLibrary('geocoding');
  try {
    const { results } = await new Geocoder().geocode({ address: text, componentRestrictions: { country: 'US' } });
    return results.slice(0, 5).map(result => ({ id: result.place_id, label: result.formatted_address, latitude: result.geometry.location.lat(), longitude: result.geometry.location.lng() }));
  } catch (error) {
    if ((error as { code?: string }).code === 'ZERO_RESULTS') return [];
    throw error;
  }
}

export function HomeSearch() {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Location[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  useEffect(() => () => { request.current?.abort(); }, []);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const current = ++sequence.current;
    const timer = window.setTimeout(() => controller.abort(), 12000);
    setBusy(true); setMessage(''); setPlaces([]);
    const timeout = new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(new Error('Search timed out')), { once: true }));
    const found: Location[] = [];
    try {
      const providers = await Promise.allSettled([searchPlaces(query.trim(), { signal: controller.signal }), geocode(query.trim())].map(async provider => {
        const locations = await Promise.race([provider, timeout]);
        if (controller.signal.aborted || current !== sequence.current) return;
        for (const place of locations) if (!found.some(existing => existing.id === place.id || (Math.abs(existing.latitude - place.latitude) < .03 && Math.abs(existing.longitude - place.longitude) < .03))) found.push(place);
        setPlaces([...found].slice(0, 6));
      }));
      if (current !== sequence.current) return;
      setMessage(found.length ? 'Choose a location to open the map.' : providers.some(result => result.status === 'rejected') ? 'Location search is unavailable. Try again or explore the map.' : 'No locations found. Try a city and state or a ZIP code.');
    } finally {
      window.clearTimeout(timer);
      if (current === sequence.current) setBusy(false);
    }
  }

  return <section className={styles.search} aria-label="Find litter near you">
    <form onSubmit={search} className={styles.searchForm} role="search">
      <label className={styles.searchField}><IoLocationOutline aria-hidden="true" /><span className="sr-only">City or ZIP code</span><input type="search" placeholder="Enter a city or ZIP code" value={query} minLength={2} maxLength={120} required autoComplete="off" onChange={event => { sequence.current++; request.current?.abort(); setQuery(event.target.value); setPlaces([]); setMessage(''); setBusy(false); }} /></label>
      <button className={styles.button} disabled={busy} type="submit">{busy ? 'Searching…' : 'Search map'}</button>
    </form>
    <div role="status" className={styles.searchMessage}>{message || (busy ? 'Finding locations…' : '')}</div>
    {!!places.length && <ul className={styles.searchResults}>{places.map(place => <li key={place.id}><a href={`/?${new URLSearchParams({ view: 'map', browse: '1', area: place.id, lat: String(place.latitude), lng: String(place.longitude), zoom: '12' })}`}><span>{place.label}</span><IoArrowForward aria-hidden="true" /></a></li>)}</ul>}
    {!!message && !places.length && <a className={styles.textLink} href="/?view=map&browse=1">Explore the map <span aria-hidden="true">→</span></a>}
  </section>;
}
