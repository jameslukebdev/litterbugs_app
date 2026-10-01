import Link from 'next/link';
import { PublicSiteHeader } from '@/components/public-site-header';
export const metadata = { title: 'Find a cleanup | Litterbugs', description: 'Find volunteer and funded cleanups near you, review safety guidance, and get started with Litterbugs.', alternates: { canonical: '/cleaner' } };
export default function Page() {
  return <><PublicSiteHeader activePath="/" /><main className="info-page"><h1>Find a cleanup near you</h1><p>Explore reported litter, choose a site you can access safely, and help your community.</p>
    <section className="info-page-card"><h2>Volunteer or funded cleanups</h2><p>View the report’s photos, location, current reward and availability before claiming. You must be 18 or older and accept the safety acknowledgment. Funded cleanups also require eligible payout setup.</p><Link href="/cleanup-safety">Read the safety guidelines</Link></section>
    <section className="info-page-card"><h2>Show the result</h2><p>After claiming, submit after-cleanup photos and a description before the deadline. Your account shows review progress and any requested updates.</p><Link href="/cleanup-policy">Read the cleanup and reward policy</Link></section>
    <Link href="/" className="primary-button">Explore the cleanup map</Link> <Link href="/account/connect">Set up cleanup payouts</Link>
  </main></>;
}
