'use client';

import { useEffect, type ReactNode } from 'react';

import { Icon } from '@/components/icon';

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
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !closeDisabled) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [closeDisabled, onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !closeDisabled && onClose()}>
      <section
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
    </div>
  );
}
