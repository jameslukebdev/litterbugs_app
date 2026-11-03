import Link from 'next/link';
import { AnalyticsPreferences } from './website-analytics';
export function PublicSiteFooter() {
  return (
    <footer className="discovery-footer">
      <span>© {new Date().getFullYear()} Litterbugs</span>
      <nav aria-label="Footer navigation">
        <Link href="/reports">Litter reports</Link>
        <Link href="/communities">Communities</Link>
        <Link href="/cleanup-policy">Reward policy</Link>
        <Link href="/about">About</Link>
        <Link href="/help">Help</Link>
        <Link href="/support">Support</Link>
        <Link href="/cleanup-safety">Safety</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <AnalyticsPreferences />
      </nav>
    </footer>
  );
}
