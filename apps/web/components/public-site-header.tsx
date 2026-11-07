'use client';

import Image from 'next/image';
import { IoChevronDown, IoMenuOutline, IoPhonePortraitOutline, IoMapOutline } from 'react-icons/io5';
import Link from 'next/link';
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';

import { AppLink } from '@/components/app-link';
import { GetAppNavigation } from '@/components/app-promotion';

import { HeaderAreaSearch } from './header-area-search';
import { AVAILABLE_CLEANUPS_MAP_HREF, LITTER_MAP_HREF, REPORT_ENTRY_HREF } from '@/lib/home-map-link';

import { PublicAccountAction } from '@/components/public-account-action';
import { getHeaderProfile, getServerHeaderProfile, subscribeHeaderProfile } from '@/lib/header-profile-cache';

import styles from './public-site-header.module.css';

export type PublicPath = '/reports' | '/map' | '/report-litter' | '/cleaner' | '/fund-a-cleanup' | '/locations' | '/communities' | '/cleanups' | '/get-app' | '/' | '/support' | '/about' | '/cleanup-policy' | '/cleanup-safety' | '/privacy' | '/terms' | '/help' | '/photo-review';

function HeaderLink({
  href,
  activePath,
  children,
  onNavigate,
}: {
  href: PublicPath | '/report' | `/map?${string}` | `/sign-in?${string}`;
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

const reportingLinks = [
  [REPORT_ENTRY_HREF, 'Report trash'],
  ['/report-litter', 'Reporter reward details'],
] as const;
const fundingLinks = [
  [AVAILABLE_CLEANUPS_MAP_HREF, 'Find a cleanup to fund'],
  ['/fund-a-cleanup', 'Fees, rewards & refunds'],
] as const;
const cleanupLinks = [
  [AVAILABLE_CLEANUPS_MAP_HREF, 'Find a cleanup on the map'],
  ['/cleaner', 'Claiming & getting paid'],
  ['/cleanups', 'Completed cleanups'],
  ['/communities', 'Communities'],
  ['/cleanup-safety', 'Safety guidelines'],
] as const;
const informationLinks = [
  ['/report-litter', 'Reporting and rewards'],
  ['/help', 'Get help'],
  ['/cleanup-safety', 'Safety guidelines'],
  ['/about', 'About Litterbugs'],
  ['/support', 'Support Litterbugs'],
] as const;
type NavigationLinks = ReadonlyArray<readonly [PublicPath | '/report' | `/map?${string}` | `/sign-in?${string}`, string]>;

/** Each menu family is labelled by one bug and its colour. Report is the dragonfly (periwinkle), same as the map's Report Litter button. */
const familyIntros: Record<string, { bug: string; text: string }> = {
  Report: { bug: '/brand/ranks/dragonfly.svg', text: 'Pin litter, earn cash' },
  Donate: { bug: '/brand/bugs/bee.png', text: 'Fund a cleanup nearby' },
  Earn: { bug: '/brand/ranks/caterpillar.svg', text: 'Get paid to clean up litter' },
  Support: { bug: '/brand/bugs/butterfly.png', text: 'Help, safety and our story' },
};

function NavigationDropdown({ label, links, activePath, open, onToggle, onClose, onNavigate }: {
  label: string;
  links: NavigationLinks;
  activePath: PublicPath;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onNavigate?: () => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOpen = useRef(open);
  const openedByHover = useRef(false);
  const intro = familyIntros[label];
  function clearTimers() {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = closeTimer.current = null;
  }
  function close() { clearTimers(); openedByHover.current = false; onClose(); }
  useEffect(() => {
    isOpen.current = open;
    if (!open && closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, [open]);
  useEffect(() => () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (root.current?.closest('dialog nav')?.contains(event.target as Node)) return;
      if (!root.current?.contains(event.target as Node)) {
        clearTimers();
        onClose();
      }
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, onClose]);
  return (
    <div ref={root} className={styles.dropdown} data-nav-family={label}
      onPointerEnter={(event) => {
        clearTimers();
        // Drawer/touch navigation stays tap-controlled, including on hybrid devices.
        if (event.pointerType !== 'mouse' || root.current?.closest('dialog') || !window.matchMedia('(min-width: 760px) and (hover: hover) and (pointer: fine)').matches) return;
        if (!open) openTimer.current = setTimeout(() => {
          openTimer.current = null;
          if (!isOpen.current) { openedByHover.current = true; onToggle(); }
        }, 350);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'mouse' || root.current?.closest('dialog')) return;
        clearTimers();
        closeTimer.current = setTimeout(() => {
          closeTimer.current = null;
          if (isOpen.current && !root.current?.contains(document.activeElement)) onClose();
        }, 300);
      }}
      onBlur={(event) => { if (root.current?.closest('dialog nav')?.contains(event.relatedTarget)) return; if (!event.currentTarget.contains(event.relatedTarget)) close(); }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          clearTimers();
          if (open) {
            event.stopPropagation();
            onClose();
            trigger.current?.focus();
          }
        }
      }}>
      <button ref={trigger} className={styles.menuTrigger} type="button"
        aria-expanded={open} aria-controls={id} data-active={links.some(([href]) => href === activePath)} onClick={() => { clearTimers(); if (open && openedByHover.current) { openedByHover.current = false; return; } openedByHover.current = false; onToggle(); }}>
        {intro && <Image className={styles.triggerBug} src={intro.bug} alt="" width={64} height={64} unoptimized />}
        <span className={styles.triggerLabel}>{label}</span>
        <IoChevronDown className={styles.chevron} aria-hidden />
      </button>
      <ul id={id} className={`${styles.dropdownLinks}${label === 'Support' ? ` ${styles.helpLinks}` : ''}`} hidden={!open}>
        {intro && <li className={styles.panelIntro}><Image src={intro.bug} alt="" width={64} height={64} unoptimized />{intro.text}</li>}
        {links.map(([href, text]) => <li key={href}><HeaderLink href={href} activePath={activePath} onNavigate={() => { close(); onNavigate?.(); }}>{text}</HeaderLink></li>)}
      </ul>
    </div>
  );
}

function NavigationMenu({ activePath }: { activePath: PublicPath }) {
  const member = useSyncExternalStore(subscribeHeaderProfile, getHeaderProfile, getServerHeaderProfile);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = 'mobile-navigation-panel';

  function closeMenu() {
    dialogRef.current?.close();
  }

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const desktop = window.matchMedia(activePath === '/map' ? '(width > 760px)' : '(min-width: 840px)');
    function closeOnDesktop() {
      if (desktop.matches) dialogRef.current?.close();
    }
    desktop.addEventListener('change', closeOnDesktop);
    closeOnDesktop();
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener('change', closeOnDesktop);
    };
  }, [open, activePath]);

  return (
    <div className={styles.mobileMenu}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.menuTrigger}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => {
          dialogRef.current?.showModal();
          setOpen(true);
        }}
      >
        <IoMenuOutline aria-hidden />
        <span className={styles.menuLabel}>Menu</span>
      </button>

      <dialog
        ref={dialogRef}
        id={panelId}
        className={styles.mobileDrawer}
        aria-label="Site menu"
        onClose={() => {
          setOpen(false);
          setOpenCategory(null);
          triggerRef.current?.focus();
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const controls = event.currentTarget.querySelectorAll<HTMLElement>('button, a[href]');
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeMenu();
        }}
      >
        <div className={styles.drawerHeader}>
          <button type="button" className={styles.menuTrigger} aria-label="Close menu" aria-expanded={open} aria-controls={panelId} onClick={closeMenu}>
            <IoMenuOutline aria-hidden />
          </button>
          <Link href="/" prefetch={true} className={styles.drawerBrand} aria-label="Litterbugs home" onClick={closeMenu}>
            <Image src="/brand/litterbugs-logo.png" alt="Litterbugs" width={636} height={433} />
          </Link>
        </div>
        <nav className={styles.mobilePrimaryLinks} aria-label="Mobile navigation">
          <Link href={LITTER_MAP_HREF} prefetch={true} className={`${styles.navLink} ${styles.mapEntry}`} aria-current={activePath === '/map' ? 'page' : undefined} onClick={closeMenu}><IoMapOutline aria-hidden /><span>Open map</span></Link>
          <NavigationDropdown label="Report" links={reportingLinks} activePath={activePath}
            open={openCategory === 'reporting'} onToggle={() => setOpenCategory(openCategory === 'reporting' ? null : 'reporting')} onClose={() => setOpenCategory(current => current === 'reporting' ? null : current)} onNavigate={closeMenu} />
          {([['Donate', fundingLinks], ['Earn', cleanupLinks], ['Support', informationLinks]] as const).map(([label, links]) =>
            <NavigationDropdown key={label} label={label} links={links} activePath={activePath}
              open={openCategory === label} onToggle={() => setOpenCategory(openCategory === label ? null : label)} onClose={() => setOpenCategory(current => current === label ? null : current)} onNavigate={closeMenu} />)}
          {!member?.userId && <Link className={styles.navLink} href="/sign-in" onClick={closeMenu}>Log in / Sign up</Link>}
        </nav>
      </dialog>
    </div>
  );
}

export function PublicSiteHeader({ activePath, action, reportAction, reportId, compactMobile = false, mobileMapControls }: { activePath: PublicPath; action?: ReactNode; reportAction?: ReactNode; reportId?: string; compactMobile?: boolean; mobileMapControls?: ReactNode }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  function toggleMenu(label: string) {
    setSearchOpen(false);
    setOpenMenu(openMenu === label ? null : label);
  }
  return (
    <header className={`${styles.header}${compactMobile ? ` ${styles.compactMobile}` : ''}${activePath === '/map' ? ` ${styles.mapHeader}` : ''}`}>
      <div className={styles.inner}>
        <Link href="/" prefetch={true} className={styles.brandLink} aria-label="Litterbugs home">
          <Image src="/brand/litterbugs-logo.png" alt="Litterbugs" width={636} height={433} priority />
        </Link>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          <div className={styles.mapLink}>{activePath === '/map' ? <HeaderLink href={LITTER_MAP_HREF} activePath={activePath}>Map</HeaderLink> : <Link href={LITTER_MAP_HREF} aria-label="Open map" className={`${styles.navLink} ${styles.mapEntry}`}><IoMapOutline aria-hidden /><span className={styles.mapDesktopLabel}>Open map</span><span className={styles.mapMobileLabel}>Map</span></Link>}</div>
          <div className={styles.reportAction}>{reportAction ?? (<NavigationDropdown label="Report" links={reportingLinks} activePath={activePath} open={openMenu === 'reporting'} onToggle={() => toggleMenu('reporting')} onClose={() => setOpenMenu(null)} />)}</div>
          <div className={styles.funding}><NavigationDropdown label="Donate" links={fundingLinks} activePath={activePath} open={openMenu === 'funding'} onToggle={() => toggleMenu('funding')} onClose={() => setOpenMenu(null)} /></div>
          <div className={styles.cleaning}><NavigationDropdown label="Earn" links={cleanupLinks} activePath={activePath} open={openMenu === 'cleaning'} onToggle={() => toggleMenu('cleaning')} onClose={() => setOpenMenu(null)} /></div>
        </nav>
        <div className={styles.help}><NavigationDropdown label="Support" links={informationLinks} activePath={activePath} open={openMenu === 'help'} onToggle={() => toggleMenu('help')} onClose={() => setOpenMenu(null)} /></div>
        <div className={styles.appLink}><GetAppNavigation /><AppLink reportId={reportId} className={styles.smallAppLink}><IoPhonePortraitOutline aria-hidden />Get the app</AppLink></div>
        {activePath !== '/map' && <HeaderAreaSearch open={searchOpen} onOpenChange={value => { setSearchOpen(value); if (value) setOpenMenu(null); }} />}
        {mobileMapControls && <div className={styles.mobileMapControls}>{mobileMapControls}</div>}
        <div className={styles.account}>{action ?? <PublicAccountAction />}</div>
        <NavigationMenu activePath={activePath} />
      </div>
    </header>
  );
}
