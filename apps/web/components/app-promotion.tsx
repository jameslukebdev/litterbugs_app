'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';
import { IoCloseOutline, IoPhonePortraitOutline } from 'react-icons/io5';
import { FaApple, FaGooglePlay } from 'react-icons/fa';
import { AppLink } from './app-link';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/app-links';
import styles from './app-promotion.module.css';

export function AppStoreLinks() {
  return <div className={styles.stores}>
    <a href={APP_STORE_URL}><FaApple aria-hidden /><span>App Store</span></a>
    <a href={GOOGLE_PLAY_URL}><FaGooglePlay aria-hidden /><span>Google Play</span></a>
  </div>;
}

export function MobileAppStrip({ reportId }: { reportId?: string }) {
  return <div className={styles.strip} aria-label="Litterbugs mobile app">
    <Image src="/brand/app-icon-192.png" alt="" width={40} height={40} />
    <div className={styles.stripCopy}><strong>Take Litterbugs with you</strong><span>Report litter on the go.</span></div>
    <AppLink reportId={reportId} className={styles.useApp}>Use app</AppLink>
  </div>;
}

export function GetAppNavigation() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLAnchorElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent | FocusEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return <div className={styles.navigation} ref={root}>
    <a ref={trigger} href="/get-app" className={styles.trigger} aria-expanded={open} aria-controls={id}
      onClick={event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); setOpen(value => !value);
      }}><IoPhonePortraitOutline aria-hidden />Get the app</a>
    {open && <section id={id} className={styles.popover} aria-label="Get the Litterbugs app">
      <button type="button" className={styles.close} aria-label="Close app download panel" onClick={() => { setOpen(false); trigger.current?.focus(); }}><IoCloseOutline aria-hidden /></button>
      <Image className={styles.appIcon} src="/brand/app-icon-192.png" alt="" width={48} height={48} />
      <h2>Take Litterbugs with you</h2>
      <p>Scan with your phone to get the app.</p>
      <Image className={styles.qr} src="/brand/get-app-qr.svg" alt="QR code linking to litterbugs.app/get-app" width={176} height={176} unoptimized />
      <AppStoreLinks />
    </section>}
  </div>;
}
