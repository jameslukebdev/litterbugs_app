'use client';
import Link from 'next/link';
import { IoChevronDownOutline } from 'react-icons/io5';
import { useRouter } from 'next/navigation';

const destinations = [
  ['', 'Profile'], ['activity', 'My activity'],
  ['payments', 'Payments & payouts'], ['notifications', 'Notifications'], ['settings', 'Settings'],
] as const;
export function AccountNavigation({ destination }: { destination: string }) {
  const router = useRouter();
  const selected = destination === 'reports' ? 'activity' : destination === 'connect' ? 'payments' : destination;
  return <>
    <label className="account-page-mobile-nav">Your account
      <span className="account-select-field"><select value={selected} onChange={event => router.push(`/account${event.target.value ? `/${event.target.value}` : ''}`)}>
        {destinations.map(([path, label]) => <option key={path} value={path}>{label}</option>)}
      </select><IoChevronDownOutline aria-hidden="true" /></span>
    </label>
    <nav className="account-page-nav" aria-label="Your account">
      {destinations.map(([path, label]) => <Link key={path} href={`/account${path ? `/${path}` : ''}`} aria-current={selected === path ? 'page' : undefined}>{label}</Link>)}
    </nav>
  </>;
}
