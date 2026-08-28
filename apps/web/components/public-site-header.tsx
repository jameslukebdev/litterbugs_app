import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import styles from './public-site-header.module.css';

export type PublicPath = '/' | '/about' | '/cleanup-policy' | '/cleanup-safety' | '/privacy' | '/terms';

const policyLinks: { href: PublicPath; label: string; description: string }[] = [
  { href: '/cleanup-policy', label: 'Cleanup policy', description: 'Funding, rewards, disputes, and refunds' },
  { href: '/cleanup-safety', label: 'Safety & waiver', description: 'Claim acknowledgment and release' },
  { href: '/terms', label: 'Terms of use', description: 'Rules for using Litterbugs' },
  { href: '/privacy', label: 'Privacy policy', description: 'How information is handled' },
];

function HeaderLink({ href, activePath, children }: { href: PublicPath; activePath: PublicPath; children: ReactNode }) {
  return (
    <Link href={href} className={styles.navLink} aria-current={activePath === href ? 'page' : undefined}>
      {children}
    </Link>
  );
}

function PolicyMenu({ activePath, mobile = false }: { activePath: PublicPath; mobile?: boolean }) {
  const hasActivePolicy = policyLinks.some(({ href }) => href === activePath);

  return (
    <details className={mobile ? styles.mobileMenu : styles.policyMenu}>
      <summary className={hasActivePolicy ? styles.activeSummary : undefined}>{mobile ? 'Menu' : 'Policies'}</summary>
      <div className={mobile ? styles.mobilePopover : styles.policyPopover}>
        {mobile && (
          <div className={styles.mobilePrimaryLinks}>
            <HeaderLink href="/" activePath={activePath}>Map</HeaderLink>
            <HeaderLink href="/about" activePath={activePath}>About</HeaderLink>
          </div>
        )}
        <span className={styles.menuLabel}>Policies & legal</span>
        {policyLinks.map(({ href, label, description }) => (
          <Link
            key={href}
            href={href}
            className={styles.policyLink}
            aria-current={activePath === href ? 'page' : undefined}
          >
            <strong>{label}</strong>
            <span>{description}</span>
          </Link>
        ))}
      </div>
    </details>
  );
}

export function PublicSiteHeader({ activePath, action }: { activePath: PublicPath; action?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          <HeaderLink href="/" activePath={activePath}>Map</HeaderLink>
          <HeaderLink href="/about" activePath={activePath}>About</HeaderLink>
          <PolicyMenu activePath={activePath} />
        </nav>

        <PolicyMenu activePath={activePath} mobile />

        <Link href="/" className={styles.brandLink} aria-label="Litterbugs map">
          <Image src="/brand/litterbugs-logo.png" alt="Litterbugs" width={636} height={433} priority />
        </Link>

        <div className={styles.action}>
          {action ?? <Link href="/" className={styles.mapAction}>Open map</Link>}
        </div>
      </div>
    </header>
  );
}
