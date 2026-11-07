'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef } from 'react';
import { IoCloseOutline, IoSearchOutline } from 'react-icons/io5';
import { PlaceSearch } from './place-search';
import type { SearchPlace } from '@/lib/place-geography';
import styles from './header-area-search.module.css';

function mapDestination(place: SearchPlace) {
  const query = new URLSearchParams({ view: 'map', browse: '1', area: place.id,
    lat: String(place.latitude), lng: String(place.longitude), zoom: '12' });
  return `/map?${query}`;
}

export function HeaderAreaSearch({ open, onOpenChange, label }: { label?: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector('input')?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) onOpenChange(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, onOpenChange]);
  function close() { onOpenChange(false); trigger.current?.focus(); }
  return <div ref={root} className={label ? styles.inlineRoot : styles.root}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) onOpenChange(false); }}
    onKeyDown={event => {
      if (event.key === 'Escape' && (event.target as HTMLElement).getAttribute('aria-expanded') !== 'true') { event.preventDefault(); close(); }
    }}>
    <button ref={trigger} type="button" className={label ? styles.inlineTrigger : styles.trigger} aria-label={label || "Search your area"} title={label || "Search your area"} aria-expanded={open} aria-controls={id}
      onClick={() => onOpenChange(!open)}><IoSearchOutline aria-hidden="true" />{label}</button>
    {open && <div id={id} className={styles.panel} role="region" aria-label="Search your area">
      <IoSearchOutline className={styles.searchIcon} aria-hidden="true" />
      <PlaceSearch selected={null} onSelect={place => { onOpenChange(false); router.push(mapDestination(place)); }} onClear={() => {}} />
      <button type="button" className={styles.close} aria-label="Close area search" onClick={close}><IoCloseOutline aria-hidden="true" /></button>
    </div>}
  </div>;
}
