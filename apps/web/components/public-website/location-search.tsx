'use client';
import Link from 'next/link';

/* Internal destinations preserve the current client session during navigation. */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { IoLocationOutline, IoSearchOutline } from 'react-icons/io5';
import { searchPlaces } from '@/lib/place-search';
import { getGoogleMapsKey } from '@/lib/env';
import styles from './search.module.css';
import { findCommunity, communityInterestHref, type Community } from '@/lib/community-directory';

type Location = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

async function geocode(text: string): Promise<Location[]> {
  const key = getGoogleMapsKey();
  if (!key)
    return searchPlaces(text).then((rows) =>
      rows.map((row) => ({ ...row, label: `${row.label}, United States` })),
    );
  const { importLibrary, setOptions } = await import(
    '@googlemaps/js-api-loader'
  );
  if (typeof google === 'undefined' || !google.maps?.importLibrary) {
    setOptions({ key, v: 'weekly', authReferrerPolicy: 'origin' });
  }
  const { Geocoder } = await importLibrary('geocoding');
  try {
    const { results } = await new Geocoder().geocode({ address: text });
    return results.slice(0, 5).map((result) => ({
      id: result.place_id,
      label: result.formatted_address,
      latitude: result.geometry.location.lat(),
      longitude: result.geometry.location.lng(),
    }));
  } catch (error) {
    if ((error as { code?: string }).code === 'ZERO_RESULTS') return [];
    throw error;
  }
}

export function LocationSearch({ compact = false, initialQuery = '', communityMode = false, interest = 'all' }: { compact?: boolean; initialQuery?: string; communityMode?: boolean; interest?: 'all' | 'cleanups' | 'groups' | 'results' }) {
  const [query, setQuery] = useState(initialQuery);
  const [places, setPlaces] = useState<Location[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [communityMatch, setCommunityMatch] = useState<Community | null>(null);
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    request.current?.abort();
    setCommunityMatch(null);
    const matchedCommunity = communityMode ? findCommunity(query) : null;
    if (matchedCommunity) {
      sequence.current++; setPlaces([]); setBusy(false); setCommunityMatch(matchedCommunity); setMessage('Community found.'); return;
    }
    const controller = new AbortController();
    request.current = controller;
    const current = ++sequence.current;
    const timer = window.setTimeout(() => controller.abort(), 12000);
    setBusy(true);
    setMessage('');
    setPlaces([]);
    const timeout = new Promise<never>((_, reject) =>
      controller.signal.addEventListener(
        'abort',
        () => reject(new Error('Search timed out')),
        { once: true },
      ),
    );
    const found: Location[] = [];
    try {
      const providers = await Promise.allSettled(
        [geocode(query.trim())].map(async (provider) => {
          const locations = await Promise.race([provider, timeout]);
          if (controller.signal.aborted || current !== sequence.current) return;
          for (const place of locations)
            if (
              !found.some(
                (existing) =>
                  existing.id === place.id ||
                  (Math.abs(existing.latitude - place.latitude) < 0.03 &&
                    Math.abs(existing.longitude - place.longitude) < 0.03),
              )
            )
              found.push(place);
          setPlaces([...found].slice(0, 6));
        }),
      );
      if (current !== sequence.current) return;
      setMessage(
        found.length
          ? ''
          : providers.some((result) => result.status === 'rejected')
            ? 'Location search is unavailable. Please try again.'
            : 'No locations found.',
      );
    } finally {
      window.clearTimeout(timer);
      if (current === sequence.current) setBusy(false);
    }
  }

  return (
    <section className={`${styles.search}${compact ? ` ${styles.compact}` : ''}`} aria-label={communityMode ? 'Find a community' : 'Find litter near you'}>
      <form onSubmit={search} className={styles.searchForm} role="search" aria-label={communityMode ? 'Search communities worldwide' : undefined}>
        <label className={styles.searchField}>
          <IoLocationOutline aria-hidden="true" />
          <span className="sr-only">City, region, or postal code</span>
          <input
            type="search"
            placeholder={compact ? 'City or postal code' : 'City, region, or postal code'}
            value={query}
            minLength={2}
            maxLength={120}
            required
            autoComplete="off"
            onChange={(event) => {
              sequence.current++;
              request.current?.abort();
              setQuery(event.target.value);
              setCommunityMatch(null);
              setPlaces([]);
              setMessage('');
              setBusy(false);
            }}
          />
        </label>
        <button className={styles.button} disabled={busy} type="submit" aria-label={busy ? 'Searching…' : communityMode ? 'Find a community' : 'Search map'}>
          {compact ? <IoSearchOutline aria-hidden="true" /> : busy ? 'Searching…' : communityMode ? 'Find a community' : 'Search map'}
        </button>
      </form>
      <div role="status" className={styles.searchMessage}>
        {message || (busy ? 'Finding locations…' : '')}
      </div>
      {communityMatch && <ul className={styles.searchResults}><li><Link href={communityInterestHref(communityMatch, interest)}><span><strong>{communityMatch.name}</strong><br />{communityMatch.administrativeArea}, {communityMatch.country}</span><span>Explore community</span></Link></li></ul>}
      {!!places.length && (
        <ul className={styles.searchResults}>
          {places.map((place) => (
            <li key={place.id}>
              <Link
                href={`/map?${new URLSearchParams({ view: 'map', browse: '1', area: place.id, lat: String(place.latitude), lng: String(place.longitude), zoom: '12', ...(communityMode && interest === 'cleanups' ? {status:'available'} : communityMode && interest === 'results' ? {status:'completed'} : {}) })}`}
              >
                <span>{place.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!!message && !places.length && !communityMatch && (
        <Link className={styles.textLink} href="/map?view=map&browse=1">
          Open the map
        </Link>
      )}
    </section>
  );
}
