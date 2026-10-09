'use client';

import Image from 'next/image';
import { IoMenuOutline, IoCloseOutline, IoPhonePortraitOutline } from 'react-icons/io5';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { AppLink } from '@/components/app-link';
import { GetAppNavigation, MobileAppStrip } from '@/components/app-promotion';

import { PublicAccountAction } from '@/components/public-account-action';

import styles from './public-site-header.module.css';

export type PublicPath = '/get-app' | '/' | '/support' | '/about' | '/cleanup-policy' | '/cleanup-safety' | '/privacy' | '/terms' | '/help' | '/photo-review';

const policyLinks: { href: PublicPath; label: string; description: string }[] = [
  { href: '/cleanup-policy', label: 'Cleanup policy', description: 'Funding, rewards, disputes, and refunds' },
  { href: '/cleanup-safety', label: 'Safety & waiver', description: 'Claim acknowledgment and release' },
  { href: '/terms', label: 'Terms of use', description: 'Rules for using Litterbugs' },
  { href: '/privacy', label: 'Privacy policy', description: 'How information is handled' },
];

function HeaderLink({
  href,
  activePath,
  children,
  onNavigate,
}: {
  href: PublicPath | '/?view=map';
  activePath: PublicPath;
  children: ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch={true}
      className={styles.navLink}
      aria-current={activePath === href.split('?')[0] ? 'page' : undefined}
      onClick={onNavigate}
    >
      {children}
    </Link>
  );
}

function NavigationMenu({ activePath, mobile = false, accountLinks = false }: { activePath: PublicPath; mobile?: boolean; accountLinks?: boolean }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasActivePolicy = policyLinks.some(({ href }) => href === activePath);
  const panelId = mobile ? 'mobile-navigation-panel' : 'information-navigation-panel';

  useEffect(() => {
    if (!open) return;

    function closeOnPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') { setOpen(false); menuRef.current?.querySelector('button')?.focus(); }
    }

    document.addEventListener('pointerdown', closeOnPointerDown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className={mobile ? styles.mobileMenu : styles.infoMenu}>
      <button
        type="button"
        className={styles.menuTrigger}
        aria-label={mobile ? (open ? 'Close menu' : 'Open menu') : undefined}
        aria-expanded={open}
        aria-controls={panelId}
        data-active={!mobile && hasActivePolicy ? 'true' : undefined}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        {mobile ? (open ? <IoCloseOutline aria-hidden /> : <IoMenuOutline aria-hidden />) : 'Safety'}
      </button>

      {open && (
        <nav
          id={panelId}
          className={mobile ? styles.mobilePopover : styles.infoPopover}
          aria-label={mobile ? 'Mobile navigation' : 'Information and policies'}
        >
          {mobile && (
            <>
              <span className={styles.menuLabel}>Explore</span>
              <div className={styles.mobilePrimaryLinks}>
                <HeaderLink href="/?view=map" activePath={activePath} onNavigate={() => setOpen(false)}>Map</HeaderLink>
                <HeaderLink href="/about" activePath={activePath} onNavigate={() => setOpen(false)}>About</HeaderLink>
                <HeaderLink href="/get-app" activePath={activePath} onNavigate={() => setOpen(false)}>Get the app</HeaderLink>
                <HeaderLink href="/help" activePath={activePath} onNavigate={() => setOpen(false)}>Help</HeaderLink>
                <HeaderLink href="/support" activePath={activePath} onNavigate={() => setOpen(false)}>Contact</HeaderLink>
                {accountLinks && <><Link className={styles.navLink} href="/account" onClick={() => setOpen(false)}>Profile / sign in</Link><Link className={styles.navLink} href="/account/notifications" onClick={() => setOpen(false)}>Updates</Link></>}
              </div>
            </>
          )}

          <span className={styles.menuLabel}>Policies &amp; safety</span>
          <div className={styles.policyLinks}>
            {policyLinks.map(({ href, label, description }) => (
              <Link
                key={href}
                href={href}
                className={styles.policyLink}
                aria-current={activePath === href.split('?')[0] ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                <strong>{label}</strong>
                <span>{description}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

export function PublicSiteHeader({ activePath, action, reportId, compactMobile = false }: { activePath: PublicPath; action?: ReactNode; reportId?: string; compactMobile?: boolean }) {
  return (
    <header className={`${styles.header}${compactMobile ? ` ${styles.compactMobile}` : ''}`}>
      {activePath !== '/get-app' && <div className={styles.appStrip}><MobileAppStrip reportId={reportId} /></div>}
      <div className={styles.inner}>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          <div className={styles.downloadNav}><GetAppNavigation /></div>
          <HeaderLink href="/?view=map" activePath={activePath}>Map</HeaderLink>
          <HeaderLink href="/about" activePath={activePath}>About</HeaderLink>
        </nav>

        <NavigationMenu activePath={activePath} mobile accountLinks={compactMobile} />
        {activePath !== '/get-app' && <AppLink reportId={reportId} className={styles.tabletAppLink}><IoPhonePortraitOutline aria-hidden />Get the app</AppLink>}

        <Link href="/?view=map" prefetch={true} className={styles.brandLink} aria-label="Litterbugs map">
          <Image src="/brand/litterbugs-logo.png" alt="Litterbugs" width={636} height={433} priority />
        </Link>

        <div className={styles.desktopActions}>
          <NavigationMenu activePath={activePath} />
          <div className={styles.action}>
            {action ?? <PublicAccountAction />}
            {compactMobile && <AppLink reportId={reportId} className={styles.compactAppLink}><IoPhonePortraitOutline aria-hidden />Get the app</AppLink>}
          </div>
        </div>
      </div>
    </header>
  );
}
