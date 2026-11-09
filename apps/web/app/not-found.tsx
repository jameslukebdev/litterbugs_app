/* eslint-disable @next/next/no-img-element -- small wandering ladybug, like the map's bugs. */
import Link from 'next/link';
import { Website, styles } from '@/components/public-website';

/** Any address that doesn't match a page. A lost ladybug wanders back and forth (globals: .lost-ladybug). */
export default function NotFound() {
  return (
    <Website activePath="/">
      <main id="main-content" tabIndex={-1} className={`${styles.guide} lost-page`}>
        <div className="lost-ladybug-track" aria-hidden="true"><img className="lost-ladybug" src="/brand/bugs/ladybug.png" alt="" width={32} height={32} /></div>
        <h1>We can’t find that page</h1>
        <p>The link may be old or mistyped. This ladybug is looking too.</p>
        <p><Link href="/map">Open the map</Link> or <Link href="/">go to the homepage</Link>.</p>
      </main>
    </Website>
  );
}
