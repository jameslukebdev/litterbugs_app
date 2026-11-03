'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';

import { createPortal } from 'react-dom';
import { Icon } from '@/components/icon';
import { moveDialogFocus } from '@/lib/dialog-focus';

const subscribe = () => () => {};
type ModalChildren = ReactNode | ((close: () => void) => ReactNode);
function ModalContent({ children, onClose }: { children: ModalChildren; onClose: () => void }) {
  return typeof children === 'function' ? children(onClose) : children;
}

export function ModalShell({
  children,
  onClose,
  label,
  className = '',
  closeDisabled = false,
  embedded = false,
}: {
  children: ModalChildren;
  onClose: () => void;
  label: string;
  className?: string;
  closeDisabled?: boolean;
  embedded?: boolean;
}) {
  const clientReady = useSyncExternalStore(subscribe, () => true, () => false);
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const disabledRef = useRef(closeDisabled);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    onCloseRef.current();
  }, []);
  const requestClose = useCallback(() => {
    if (disabledRef.current || closingRef.current) return;
    const animate = window.matchMedia?.('(max-width: 760px)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!animate) { onCloseRef.current(); return; }
    closingRef.current = true;
    setClosing(true);
    // Keep focus and scroll locked until the short exit animation finishes.
    closeTimer.current = setTimeout(finishClose, 200);
  }, [finishClose]);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  useEffect(() => { onCloseRef.current = onClose; disabledRef.current = closeDisabled; }, [onClose, closeDisabled]);
  useEffect(() => {
    if (embedded) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (Array.from(document.querySelectorAll('[role="dialog"]')).at(-1) !== dialogRef.current) return;
      if (event.key === 'Escape' && !disabledRef.current) {
        event.preventDefault(); requestClose();
      }
      if (dialogRef.current) moveDialogFocus(dialogRef.current, event);
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [embedded, requestClose]);

  const content = <ModalContent onClose={requestClose}>{children}</ModalContent>;
  if (embedded) return <section className={`embedded-panel ${className}`} aria-label={label}>{content}</section>;
  if (!clientReady) return null;
  return createPortal(
    <div className="modal-backdrop" role="presentation" data-closing={closing || undefined} onMouseDown={requestClose}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        className={`modal-shell ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button modal-close" onClick={requestClose} disabled={closeDisabled || closing} aria-label="Close">
          <Icon name="close" />
        </button>
        {content}
      </section>
    </div>, document.body
  );
}
