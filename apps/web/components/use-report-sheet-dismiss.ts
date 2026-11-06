'use client';

import { useEffect, type RefObject } from 'react';

/** Let the sheet own downward gestures only before its content starts scrolling. */
export function useReportSheetDismiss(
  panelRef: RefObject<HTMLElement | null>,
  closeRef: RefObject<() => void>,
  enabled: boolean,
) {
  useEffect(() => {
    const panel = panelRef.current;
    if (!enabled || !panel) return;
    let gesture: { x: number; y: number; distance: number; dragging: boolean } | null = null;
    let dismissTimer: ReturnType<typeof setTimeout> | undefined;
    let suppressClick = false;
    const handle = panel.querySelector<HTMLButtonElement>('.report-detail-dismiss-handle');
    let handleDrag: { id: number; x: number; y: number; distance: number } | null = null;

    function handleDown(event: PointerEvent) {
      if (event.button !== 0 || dismissTimer || !window.matchMedia?.('(max-width: 700px)').matches) return;
      suppressClick = false;
      handleDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0 };
      handle?.setPointerCapture?.(event.pointerId);
    }

    function handleMove(event: PointerEvent) {
      if (handleDrag?.id !== event.pointerId) return;
      const distance = Math.max(0, event.clientY - handleDrag.y);
      if (!suppressClick && (distance < 10 || distance <= Math.abs(event.clientX - handleDrag.x))) return;
      handleDrag.distance = distance;
      suppressClick = true;
      panel!.setAttribute('data-dragging', 'true');
      panel!.style.setProperty('--sheet-drag-y', `${handleDrag.distance}px`);
    }

    function handleUp(event: PointerEvent) {
      if (handleDrag?.id !== event.pointerId) return;
      const shouldDismiss = event.type === 'pointerup' && handleDrag.distance >= 90;
      handleDrag = null;
      reset();
      if (shouldDismiss) dismiss();
    }

    function dismiss() {
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      panel!.style.setProperty('--sheet-drag-y', `${window.innerHeight}px`);
      dismissTimer = setTimeout(() => closeRef.current(), reducedMotion ? 0 : 200);
    }

    function reset() {
      gesture = null;
      panel!.removeAttribute('data-dragging');
      panel!.style.removeProperty('--sheet-drag-y');
    }

    function start(event: TouchEvent) {
      if (event.target instanceof Element && event.target.closest('.report-detail-dismiss-handle')) return;
      reset();
      suppressClick = false;
      if (dismissTimer || event.touches.length !== 1 || !window.matchMedia?.('(max-width: 700px)').matches) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest('[role="dialog"]') !== panel) return;
      if (target.closest('button, a, input, textarea, select, [role="button"]')) return;
      const scroller = panel!.querySelector('.report-detail-layout');
      if (scroller?.contains(target) && scroller.scrollTop > 0) return;
      const touch = event.touches[0];
      gesture = { x: touch.clientX, y: touch.clientY, distance: 0, dragging: false };
    }

    function move(event: TouchEvent) {
      if (!gesture) return;
      if (event.touches.length !== 1) { reset(); return; }
      const dx = event.touches[0].clientX - gesture.x;
      const dy = event.touches[0].clientY - gesture.y;
      if (!gesture.dragging) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return;
        // Lock to the first deliberate direction: never steal a scroll or photo swipe.
        if (dy <= 0 || Math.abs(dx) >= dy || !event.cancelable) { reset(); return; }
        gesture.dragging = true;
        suppressClick = true;
        panel!.setAttribute('data-dragging', 'true');
      }
      if (event.cancelable) event.preventDefault();
      gesture.distance = Math.max(0, dy);
      panel!.style.setProperty('--sheet-drag-y', `${gesture.distance}px`);
    }

    function end() {
      if (!gesture) return;
      const shouldDismiss = gesture.dragging && gesture.distance >= 90;
      reset();
      if (shouldDismiss) dismiss();
    }

    function click(event: MouseEvent) {
      if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; }
    }

    handle?.addEventListener('pointerdown', handleDown);
    handle?.addEventListener('pointermove', handleMove);
    handle?.addEventListener('pointerup', handleUp);
    handle?.addEventListener('pointercancel', handleUp);
    panel.addEventListener('touchstart', start, { passive: true });
    // React's delegated touch listeners are passive; cancel only an owned downward drag.
    panel.addEventListener('touchmove', move, { passive: false });
    panel.addEventListener('touchend', end);
    panel.addEventListener('touchcancel', reset);
    panel.addEventListener('click', click, true);
    return () => {
      clearTimeout(dismissTimer);
      handle?.removeEventListener('pointerdown', handleDown);
      handle?.removeEventListener('pointermove', handleMove);
      handle?.removeEventListener('pointerup', handleUp);
      handle?.removeEventListener('pointercancel', handleUp);
      reset();
      panel.removeEventListener('touchstart', start);
      panel.removeEventListener('touchmove', move);
      panel.removeEventListener('touchend', end);
      panel.removeEventListener('touchcancel', reset);
      panel.removeEventListener('click', click, true);
    };
  }, [panelRef, closeRef, enabled]);
}
