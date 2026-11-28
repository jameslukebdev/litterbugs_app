'use client';

import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { useEffect, useRef, useState } from 'react';
import { FiCopy, FiNavigation } from 'react-icons/fi';
import { getGoogleMapsKey, getGoogleMapsMapId } from '@/lib/env';
import styles from './report-share.module.css';

const BUGS = { open: '/brand/bugs/ladybug.png', busy: '/brand/ranks/caterpillar.svg', done: '/brand/bugs/flower.png', muted: '/brand/bugs/ladybug.png' } as const;

/**
 * Where the report is: its nearest address, its exact coordinates, directions,
 * and a live map with the report's bug on the spot. The map only loads once
 * this section scrolls into view, so a visitor who never reaches it costs no
 * map load.
 */
export function ReportLocation({ latitude, longitude, address, kind, title, mapHref }: {
  latitude: number;
  longitude: number;
  address: string | null;
  kind: keyof typeof BUGS;
  title: string;
  /** The site's own map page for this report; absent where the report is no longer on it. */
  mapHref?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<'address' | 'coordinates' | null>(null);
  const [failed, setFailed] = useState(false);
  // Five decimals is about one metre: the exact spot, readable and pasteable into any map app.
  const coordinates = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  // Opens Google Maps on a pin at these coordinates, named by the coordinates themselves, with
  // its Directions button beside it. Google's direct directions link was tried and rejected: it
  // relabels the destination with its own nearest street address, which reads as a different place.
  const directions = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  useEffect(() => {
    const element = frame.current;
    const key = getGoogleMapsKey();
    if (!element || !key) { setFailed(true); return; }
    let cancelled = false;
    async function start() {
      try {
        if (typeof google === 'undefined' || !google.maps?.importLibrary) setOptions({ key, v: 'weekly', authReferrerPolicy: 'origin' });
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([importLibrary('maps'), importLibrary('marker')]);
        if (cancelled || !frame.current) return;
        const position = { lat: latitude, lng: longitude };
        const map = new Map(frame.current, {
          center: position, zoom: 16, mapId: getGoogleMapsMapId() || undefined,
          disableDefaultUI: true, zoomControl: true, fullscreenControl: true, clickableIcons: false,
          // One finger scrolls the page; the map moves with two fingers or Ctrl+scroll.
          gestureHandling: 'cooperative',
        });
        const pin = document.createElement('span');
        pin.className = styles.locationPin;
        pin.dataset.kind = kind;
        const bug = document.createElement('img');
        bug.src = BUGS[kind]; bug.alt = ''; bug.width = 22; bug.height = 22;
        pin.appendChild(bug);
        new AdvancedMarkerElement({ map, position, content: pin, title });
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); void start(); }
    }, { rootMargin: '300px' });
    observer.observe(element);
    return () => { cancelled = true; observer.disconnect(); };
  }, [latitude, longitude, kind, title]);

  async function copy(what: 'address' | 'coordinates') {
    try {
      await navigator.clipboard.writeText(what === 'address' && address ? address : coordinates);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 2500);
    } catch { /* both stay selectable on the page */ }
  }

  return (
    <section className={styles.location} aria-labelledby="report-location-heading">
      <h2 id="report-location-heading">Location</h2>
      <p className={styles.locationAddress}>{address ? `Near ${address}` : 'No street address is recorded for this spot.'}</p>
      {/* The address is the nearest one on record; the coordinates are the spot itself. */}
      <p className={styles.locationCoordinates}>Exact spot: <span>{coordinates}</span></p>
      <div className={styles.locationActions}>
        <a className={styles.locationButton} href={directions} target="_blank" rel="noreferrer"><FiNavigation aria-hidden="true" />Get directions</a>
        <button type="button" className={styles.locationButton} onClick={() => copy('coordinates')}>
          <FiCopy aria-hidden="true" /><span aria-live="polite">{copied === 'coordinates' ? 'Copied' : 'Copy coordinates'}</span>
        </button>
        {address && <button type="button" className={styles.locationButton} onClick={() => copy('address')}>
          <FiCopy aria-hidden="true" /><span aria-live="polite">{copied === 'address' ? 'Copied' : 'Copy address'}</span>
        </button>}
      </div>
      {!failed && <div className={styles.locationMap} ref={frame} role="region" aria-label={`Map showing ${title}`} />}
      {failed && mapHref && <p className={styles.locationAddress}><a href={mapHref}>Open this report on the map</a></p>}
    </section>
  );
}
