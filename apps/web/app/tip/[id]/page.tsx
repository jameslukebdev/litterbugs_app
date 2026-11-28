/* eslint-disable @next/next/no-img-element -- small rank bug artwork, like the leaderboard. */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FiChevronLeft } from 'react-icons/fi';
import { Website } from '@/components/public-website';
import { rankFor } from '@/components/community-leaderboard/ranks';
import { getProfileAvatarUrl } from '@/lib/profile';
import { createPublicClient } from '@/lib/supabase/public';
import { loadTipRecipient } from '@/lib/tips-server';
import { RecipientAvatar } from './recipient-avatar';
import { TipForm } from './tip-form';
import styles from '../tip.module.css';

export const metadata = { title: 'Send a tip | Litterbugs', robots: { index: false, follow: false } };

const boardPath = /^\/communities(?:\/[a-z0-9-]{1,80}\/[a-z0-9-]{1,80}\/[a-z0-9-]{1,80})?$/;
const reportPath = /^\/reports\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export default async function TipPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string; town?: string; role?: string }>;
}) {
  const { id } = await params;
  const recipient = await loadTipRecipient(id);
  if (!recipient) notFound();
  const { back, town, role } = await searchParams;
  const reporter = role === 'reporter';
  // Back to the report or leaderboard board the visitor came from.
  const fromReport = typeof back === 'string' && reportPath.test(back);
  const backHref = fromReport ? back
    : `${typeof back === 'string' && boardPath.test(back) ? back : '/communities'}?board=${reporter ? 'reporters' : 'cleaners'}`;
  const backLabel = fromReport ? 'Back to the report' : 'Back to the leaderboard';
  const rank = rankFor(recipient.rank_points);
  // The town is a label from the leaderboard row; everything else comes from the server.
  const place = typeof town === 'string' ? town.trim().slice(0, 80) : '';
  const count = reporter ? recipient.reports : recipient.cleanups;
  const noun = reporter ? 'report' : 'cleanup';
  const facts = [place, count > 0 ? `${count} ${noun}${count === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ');
  const avatarUrl = getProfileAvatarUrl(createPublicClient(), { ...recipient, display_name: recipient.name });

  return (
    <Website>
      <main id="main-content" className={styles.page} tabIndex={-1}>
        <div className={styles.context}>
          <Link className={styles.back} href={backHref}><FiChevronLeft aria-hidden="true" /> {backLabel}</Link>
        </div>
        <section className={styles.card} aria-labelledby="tip-heading">
          <header className={styles.heading}>
            <span className={styles.who}>
              <RecipientAvatar name={recipient.name} url={avatarUrl} />
              <img className={styles.rankBug} src={rank.artwork} alt={rank.name} width={30} height={30} />
            </span>
            <h1 id="tip-heading">Tip {recipient.name}</h1>
            {facts && <p className={styles.facts}>{facts}</p>}
          </header>
          {recipient.can_receive_tips
            ? <TipForm cleanerId={id} name={recipient.name} backHref={backHref} backLabel={backLabel}
              role={reporter ? 'reporter' : 'cleaner'} reportId={fromReport ? back.split('/')[2] : undefined} />
            : <p className={styles.closed}>{recipient.name} can’t receive tips right now.</p>}
        </section>
      </main>
    </Website>
  );
}
