'use client';
import Link from 'next/link';
import type { IconType } from 'react-icons';
import { FiBell, FiCreditCard, FiList, FiSettings, FiUser } from 'react-icons/fi';

/** Each section keeps its own colour, shown on its icon (no tinted backgrounds). */
const destinations: ReadonlyArray<readonly [path: string, label: string, short: string, icon: IconType, ink: string]> = [
  ['', 'Profile', 'Profile', FiUser, '#4438bb'],
  ['activity', 'My activity', 'Activity', FiList, '#ac343b'],
  ['payments', 'Payments & payouts', 'Payments', FiCreditCard, '#775700'],
  ['notifications', 'Notifications', 'Updates', FiBell, '#783398'],
  ['settings', 'Settings', 'Settings', FiSettings, '#45434d'],
];

export function AccountNavigation({ destination }: { destination: string }) {
  const selected = destination === 'reports' ? 'activity' : destination === 'connect' ? 'payments' : destination;
  return <nav className="account-v2-nav" aria-label="Your account">
    {destinations.map(([path, label, short, Icon, ink]) => (
      <Link key={path} href={`/account${path ? `/${path}` : ''}`} aria-current={selected === path ? 'page' : undefined} aria-label={label} style={{ '--section-ink': ink } as React.CSSProperties}>
        <Icon aria-hidden="true" />
        <span className="account-v2-nav-short" aria-hidden="true">{short}</span>
        <span className="account-v2-nav-long" aria-hidden="true">{label}</span>
      </Link>
    ))}
  </nav>;
}
