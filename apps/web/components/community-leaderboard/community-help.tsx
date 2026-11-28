import { FiArrowUpRight, FiDroplet, FiMapPin, FiTrash2, FiTruck, FiUsers } from 'react-icons/fi';
import type { GuideQuestion, HelpCard, HelpIcon } from '@/lib/community-help';
import styles from './leaderboard.module.css';

const ICONS: Record<HelpIcon, typeof FiUsers> = { group: FiUsers, street: FiMapPin, stream: FiDroplet, road: FiTruck, dropoff: FiTrash2 };

/** Reviewed local groups as cards named by need, then the cleanup guide as fold-open questions. */
export function CommunityHelp({ communitySlug, cards, guide, reviewedAt }: { communitySlug: string; cards: HelpCard[]; guide: GuideQuestion[]; reviewedAt: string | null }) {
  if (!cards.length && !guide.length) return null;
  const reviewed = reviewedAt && new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(reviewedAt));
  return <section className={styles.helpSection} aria-labelledby="help-title" id="local-help">
    <h2 id="help-title">Local groups and cleanup help</h2>
    {cards.length > 0 && <ul className={styles.help}>
      {cards.map(card => {
        const Icon = ICONS[card.icon];
        return <li key={card.resourceId}>
          <a href={card.href} target="_blank" rel="noopener noreferrer" data-community-resource={card.resourceId} data-community-id={communitySlug}>
            <span className={styles.helpIcon}><Icon aria-hidden="true" /></span>
            <span className={styles.helpCopy}><strong>{card.need}</strong><span>{card.who}</span><span>{card.detail}</span></span>
            <FiArrowUpRight className={styles.helpGo} aria-label="Opens another site" />
          </a>
        </li>;
      })}
    </ul>}
    {guide.length > 0 && <div className={styles.guide}>
      {guide.map(item => <details key={item.question}>
        <summary>{item.question}</summary>
        <div className={styles.guideBody}>
          {item.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          {item.links.length > 0 && <ul>{item.links.map(link => <li key={link.href}><a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a></li>)}</ul>}
        </div>
      </details>)}
      {reviewed && <p className={styles.reviewed}>Program and disposal details checked {reviewed}. Confirm arrangements with the provider before your cleanup.</p>}
    </div>}
  </section>;
}
