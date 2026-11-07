'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './map-preview.module.css';

/**
 * The homepage map is a picture, not a live map. When someone tries to drag it or pinch-zoom it,
 * say where the real map is instead of silently doing nothing (or opening the map mid-drag).
 */
export function MapPreviewNudge() {
  const hint = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = hint.current?.parentElement;
    if (!frame) return;
    let timer = 0;
    let start: { x: number; y: number } | null = null;
    let dragged = false;
    const show = () => {
      setVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setVisible(false), 1800);
    };
    const onDown = (event: PointerEvent) => {
      dragged = false;
      start = event.pointerType === 'mouse' && (event.target as Element).closest('a[data-map-backdrop]') ? { x: event.clientX, y: event.clientY } : null;
    };
    const onMove = (event: PointerEvent) => {
      if (!start || dragged || Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8) return;
      dragged = true;
      show();
    };
    const onUp = () => { start = null; };
    // A drag that ends on the picture would otherwise count as a click and leave the page.
    const onClick = (event: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      event.preventDefault();
      event.stopPropagation();
    };
    // Trackpad pinch arrives as ctrl + wheel; plain scrolling still scrolls the page.
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      show();
    };
    const onTouch = (event: TouchEvent) => { if (event.touches.length > 1) show(); };
    frame.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    frame.addEventListener('click', onClick, true);
    frame.addEventListener('wheel', onWheel, { passive: false });
    frame.addEventListener('touchstart', onTouch, { passive: true });
    return () => {
      window.clearTimeout(timer);
      frame.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      frame.removeEventListener('click', onClick, true);
      frame.removeEventListener('wheel', onWheel);
      frame.removeEventListener('touchstart', onTouch);
    };
  }, []);

  return (
    <div ref={hint} className={styles.nudge} data-visible={visible || undefined} role="status" aria-live="polite">
      {visible && <span>Open the full map to move around and zoom</span>}
    </div>
  );
}
