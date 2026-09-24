'use client';

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';

import { createPortal } from 'react-dom';
import { Icon } from '@/components/icon';

const subscribe = () => () => {};

export function ModalShell({
  children,
  onClose,
  label,
  className = '',
  closeDisabled = false,
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
  className?: string;
  closeDisabled?: boolean;
}) {
  const clientReady = useSyncExternalStore(subscribe, () => true, () => false);
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const disabledRef = useRef(closeDisabled);
  useEffect(() => { onCloseRef.current = onClose; disabledRef.current = closeDisabled; }, [onClose, closeDisabled]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (Array.from(document.querySelectorAll('[role="dialog"]')).at(-1) !== dialogRef.current) return;
      if (event.key === 'Escape' && !disabledRef.current) {
        event.preventDefault(); onCloseRef.current();
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])',
      )).filter(item => item.getClientRects().length > 0);
      const first = items[0]; const last = items.at(-1);
      if (!first || !last) { event.preventDefault(); dialogRef.current.focus(); return; }
      if (!dialogRef.current.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
        event.preventDefault(); first.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  if (!clientReady) return null;
  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !closeDisabled && onClose()}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        className={`modal-shell ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button modal-close" onClick={onClose} disabled={closeDisabled} aria-label="Close">
          <Icon name="close" />
        </button>
        {children}
      </section>
    </div>, document.body
  );
}
