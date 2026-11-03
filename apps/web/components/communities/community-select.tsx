'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { IoCheckmarkOutline, IoChevronDownOutline } from 'react-icons/io5';
import styles from './community-select.module.css';

export function CommunitySelect({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    items.current[Math.max(0, options.findIndex(option => option.value === value))]?.focus();
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, options, value]);
  function close() { setOpen(false); trigger.current?.focus(); }
  return <div ref={root} className={styles.sort} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" className={styles.trigger} aria-label={`${label}: ${options.find(option => option.value === value)?.label}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); } }}>
      {options.find(option => option.value === value)?.label}<IoChevronDownOutline aria-hidden />
    </button>
    {open && <div id={id} role="menu" aria-label={label} className={styles.menu} onKeyDown={event => {
      const index = items.current.indexOf(document.activeElement as HTMLButtonElement);
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
        items.current[next]?.focus();
      }
    }}>
      {options.map((option, index) => <button key={option.value} ref={node => { items.current[index] = node; }} type="button" role="menuitemradio" aria-checked={value === option.value} tabIndex={-1} onClick={() => { onChange(option.value); close(); }}><span>{option.label}</span><IoCheckmarkOutline aria-hidden style={{ visibility: option.value === value ? 'visible' : 'hidden' }} /></button>)}
    </div>}
  </div>;
}
