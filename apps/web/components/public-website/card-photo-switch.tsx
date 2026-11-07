'use client';
import { useRef } from 'react';
import { Icon } from '@/components/icon';

/**
 * Left/right photo arrows for a server-rendered report card (same look as the map list).
 * The photos are already in the card; this only marks which one shows, via data-photo on the card.
 */
export function CardPhotoSwitch({ count, title }: { count: number; title: string }) {
  const nav = useRef<HTMLDivElement>(null);
  const index = useRef(0);
  const step = (by: number) => {
    index.current = (index.current + by + count) % count;
    nav.current?.closest<HTMLElement>('.report-card-container')?.setAttribute('data-photo', String(index.current));
  };
  return (
    <div className="card-photo-nav" ref={nav}>
      <button type="button" aria-label={`Previous photo of ${title}`} onClick={() => step(-1)}><Icon name="chevron-left" /></button>
      <button type="button" aria-label={`Next photo of ${title}`} onClick={() => step(1)}><Icon name="chevron-right" /></button>
    </div>
  );
}
