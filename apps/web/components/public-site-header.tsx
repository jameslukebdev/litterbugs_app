'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { PublicAccountAction } from '@/components/public-account-action';

import styles from './public-site-header.module.css';

export type PublicPath = '/' | '/about' | '/cleanup-policy' | '/cleanup-safety' | '/privacy' | '/terms';

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
  href: PublicPath;
  activePath: PublicPath;
  children: ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      className={styles.navLink}
      aria-current={activePath === href ? 'page' : undefined}
      onClick={onNavigate}
    >
      {children}
    </Link>
  );
}

function NavigationMenu({ activePath, mobile = false }: { activePath: PublicPath; mobile?: boolean }) {
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
      if (event.key === 'Escape') setOpen(false);
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
        aria-expanded={open}
        aria-controls={panelId}
        data-active={!mobile && hasActivePolicy ? 'true' : undefined}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        {mobile ? 'Menu' : 'Safety'}
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
                <HeaderLink href="/" activePath={activePath} onNavigate={() => setOpen(false)}>Search</HeaderLink>
                <HeaderLink href="/about" activePath={activePath} onNavigate={() => setOpen(false)}>Field Guide</HeaderLink>
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
                aria-current={activePath === href ? 'page' : undefined}
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

export function PublicSiteHeader({ activePath, action }: { activePath: PublicPath; action?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          <HeaderLink href="/" activePath={activePath}>Search</HeaderLink>
          <HeaderLink href="/about" activePath={activePath}>Field Guide</HeaderLink>
        </nav>

        <NavigationMenu activePath={activePath} mobile />

        <Link href="/" className={styles.brandLink} aria-label="Litterbugs map">
          <Image src="/brand/litterbugs-logo.png" alt="Litterbugs" width={636} height={433} priority />
        </Link>

        <div className={styles.desktopActions}>
          <NavigationMenu activePath={activePath} />
          <div className={styles.action}>
            {action ?? <PublicAccountAction />}
          </div>
        </div>
      </div>
    </header>
  );
}
