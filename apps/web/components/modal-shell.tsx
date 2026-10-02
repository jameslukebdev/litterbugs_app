'use client';

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';

import { createPortal } from 'react-dom';
import { Icon } from '@/components/icon';
import { moveDialogFocus } from '@/lib/dialog-focus';

const subscribe = () => () => {};

export function ModalShell({
  children,
  onClose,
  label,
  className = '',
  closeDisabled = false,
  embedded = false,
}: {
  children: ReactNode;
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
        event.preventDefault(); onCloseRef.current();
      }
      if (dialogRef.current) moveDialogFocus(dialogRef.current, event);
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [embedded]);

  if (embedded) return <section className={`embedded-panel ${className}`} aria-label={label}>{children}</section>;
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
