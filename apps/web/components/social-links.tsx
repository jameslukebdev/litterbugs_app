import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa6';
import styles from './social-links.module.css';

// Only owner-confirmed profiles belong here.
const profiles = [
  { name: 'Instagram', href: 'https://www.instagram.com/litterbugs_app/', Icon: FaInstagram },
  { name: 'TikTok', href: 'https://www.tiktok.com/@litterbugs.commun', Icon: FaTiktok },
  { name: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61573402678573', Icon: FaFacebookF },
] as const;

export function SocialLinks({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.socials}${compact ? ` ${styles.compact}` : ''}`} role="group" aria-label="Follow Litterbugs">
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
