import { FaInstagram, FaTiktok } from 'react-icons/fa6';
import styles from './social-links.module.css';

// Only owner-confirmed profiles belong here.
const profiles = [
  { name: 'Instagram', href: 'https://www.instagram.com/litterbugs_app/', Icon: FaInstagram },
  { name: 'TikTok', href: 'https://www.tiktok.com/@litterbugs.commun', Icon: FaTiktok },
] as const;

export function SocialLinks({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.socials}${compact ? ` ${styles.compact}` : ''}`} role="group" aria-label="Follow Litterbugs">
      {!compact && <span className={styles.label}>Follow along</span>}
      <div className={styles.icons}>
        {profiles.map(({ name, href, Icon }) => (
          <a key={name} href={href} target="_blank" rel="noopener noreferrer"
            aria-label={`Litterbugs on ${name} (opens in a new tab)`} title={name}>
            <Icon aria-hidden="true" />
          </a>
        ))}
      </div>
    </div>
  );
}
