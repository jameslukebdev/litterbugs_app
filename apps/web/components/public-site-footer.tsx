import Image from 'next/image';
import { ResponsiveLink as Link } from './responsive-link';
import { IoChevronUp } from 'react-icons/io5';
import { AnalyticsPreferences } from './website-analytics';
import { SocialLinks } from './social-links';
import styles from './public-site-footer.module.css';

/**
 * Links are grouped by what people come for: the community, getting help, and the legal small print.
 * `compact` is the single-row version under the full-height map, which can't give up much height.
 */
export function PublicSiteFooter({ compact = false }: { compact?: boolean }) {
  const secondaryLinks = <>
    <ul className={styles.group} data-tone="sun">
      <li><Link href="/help">Help</Link></li>
      <li><Link href="/cleanup-safety">Safety</Link></li>
      <li><Link href="/cleanup-policy">Reward policy</Link></li>
    </ul>
    <ul className={styles.group} data-tone="blush">
      <li><Link href="/terms">Terms</Link></li>
      <li><Link href="/privacy">Privacy</Link></li>
      <li><AnalyticsPreferences /></li>
    </ul>
  </>;

  return (
    <footer className={`discovery-footer ${styles.footer}${compact ? ` ${styles.compact}` : ''}`}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logo} aria-label="Litterbugs home">
            <Image src="/brand/litterbugs-logo.png" alt="" width={636} height={433} />
          </Link>
          <span className={styles.copyright}>© {new Date().getFullYear()} Litterbugs</span>
          <div className={styles.brandSocial}><SocialLinks compact={compact} /></div>
        </div>
        <nav className={styles.links} aria-label="Footer navigation">
          <ul className={styles.group} data-tone="lavender">
            <li><Link href="/reports">Litter reports</Link></li>
            <li><Link href="/communities">Communities</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/support">Support</Link></li>
          </ul>
          <div className={styles.secondary}>{secondaryLinks}</div>
          {compact && <details className={styles.more}>
            <summary>More <IoChevronUp aria-hidden /></summary>
            <div className={styles.moreLinks}>{secondaryLinks}<div className={styles.moreSocial}><SocialLinks /></div></div>
          </details>}
        </nav>
      </div>
    </footer>
  );
}
