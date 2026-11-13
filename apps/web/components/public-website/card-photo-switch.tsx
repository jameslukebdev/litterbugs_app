'use client';
import { useEffect, useRef } from 'react';
import { Icon } from '@/components/icon';

/**
 * Left/right photo arrows for a server-rendered report card (same look as the map list).
 * The photos are already in the card; this marks which slide and dot are active,
 * and loads the next photo ahead so stepping through feels instant.
 */
export function CardPhotoSwitch({ count, title }: { count: number; title: string }) {
  const nav = useRef<HTMLDivElement>(null);
  const index = useRef(0);
  const parts = () => {
    const card = nav.current?.closest<HTMLElement>('.report-card-container');
    return { card, slides: [...card?.querySelectorAll<HTMLElement>('.card-slide') ?? []], dots: [...card?.querySelectorAll<HTMLElement>('.report-result-dots i') ?? []] };
  };
  const preload = (slides: HTMLElement[], at: number) => {
    const image = slides[(at + count) % count]?.querySelector('img');
    if (image) image.loading = 'eager';
  };
  // Touch and keyboard users need the same adjacent-photo warmup as a mouse.
  useEffect(() => {
    const { card, slides } = parts();
    if (!card) return;
    const warm = () => { preload(slides, index.current + 1); preload(slides, index.current - 1); };
    card.addEventListener('pointerenter', warm);
    card.addEventListener('pointerdown', warm);
    card.addEventListener('focusin', warm);
    return () => {
      card.removeEventListener('pointerenter', warm);
      card.removeEventListener('pointerdown', warm);
      card.removeEventListener('focusin', warm);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per card
  }, []);
  const step = (by: number) => {
    const { slides, dots } = parts();
    index.current = (index.current + by + count) % count;
    preload(slides, index.current);
    slides.forEach((slide, n) => slide.toggleAttribute('data-active', n === index.current));
    dots.forEach((dot, n) => dot.toggleAttribute('data-active', n === Math.min(index.current, dots.length - 1)));
    preload(slides, index.current + by);
  };
  return (
    <div className="card-photo-nav" ref={nav}>
      <button type="button" aria-label={`Previous photo of ${title}`} onClick={() => step(-1)}><Icon name="chevron-left" /></button>
      <button type="button" aria-label={`Next photo of ${title}`} onClick={() => step(1)}><Icon name="chevron-right" /></button>
    </div>
  );
}
