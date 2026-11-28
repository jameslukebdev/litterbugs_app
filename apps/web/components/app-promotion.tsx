'use client';

import { GetAppQr } from '@/components/get-app-qr';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { IoCloseOutline, IoPhonePortraitOutline } from 'react-icons/io5';
import { AppLink } from './app-link';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/app-links';
import styles from './app-promotion.module.css';
import brandStyles from './public-website/brand.module.css';

export function AppStoreLinks() {
  return <div className={styles.stores}>
    <a href={APP_STORE_URL} aria-label="App Store"><Image src="/brand/app-store-badge.svg" alt="Download on the App Store" width={144} height={48} unoptimized /></a>
    <a href={GOOGLE_PLAY_URL} aria-label="Google Play"><Image src="/brand/google-play-badge.png" alt="Get it on Google Play" width={186} height={72} unoptimized /></a>
  </div>;
}

export function MobileAppStrip({ reportId }: { reportId?: string }) {
  return <div className={`${styles.strip} ${brandStyles.brand}`} aria-label="Litterbugs mobile app">
    <Image src="/brand/app-icon-192.png" alt="" width={40} height={40} />
    <div className={styles.stripCopy}><strong>Take Litterbugs with you</strong><span>Report litter on the go.</span></div>
    <AppLink reportId={reportId} className={styles.useApp}><IoPhonePortraitOutline aria-hidden />Get the app</AppLink>
  </div>;
}

// Keep the mobile invitation after the page instead of resizing the header.
export function MobilePagePromotion() {
  const pathname = usePathname();
  if (!['/about', '/support', '/help', '/cleanup-safety', '/cleanup-safety/acknowledgment', '/cleanup-policy', '/privacy', '/terms', '/photo-review', '/report', '/sign-in'].includes(pathname)) return null;
  return <aside className={styles.pagePromotion} aria-label="Get the Litterbugs app"><MobileAppStrip /></aside>;
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
      <Image className={styles.appIcon} src="/brand/app-icon-192.png" alt="" width={48} height={48} loading="eager" unoptimized />
      <h2>Take Litterbugs with you</h2>
      <GetAppQr className={styles.qr} />
      <AppStoreLinks />
    </section>}
  </div>;
}
