/* eslint-disable @next/next/no-img-element -- Private Supabase images use short-lived signed URLs. */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { publicReportShareDescription } from '@/lib/public-report-share-model';
import { loadPublicReportShare } from '@/lib/public-report-share';
import { OpenReportAction } from './open-report-action';

import styles from './report-share.module.css';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
};

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
  : null;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const report = await loadPublicReportShare(id);
  if (!report) return { title: 'Report unavailable | Litterbugs' };

  const description = publicReportShareDescription(report);
  return {
    title: `${report.title} | Litterbugs`,
    description,
    alternates: { canonical: report.canonicalUrl },
    openGraph: {
      type: 'article',
      title: report.title,
      description,
      url: report.canonicalUrl,
      siteName: 'Litterbugs',
    },
    twitter: {
      card: 'summary_large_image',
      title: report.title,
      description,
    },
    itunes: {
      appId: '6757313862',
      appArgument: report.canonicalUrl,
    },
  };
}

export default async function SharedReportPage({ params }: Props) {
  const { id } = await params;
  const report = await loadPublicReportShare(id);
  if (!report) notFound();

  const completed = report.state === 'completed';
  const impactFacts = [
    report.bagsOrItemsRemoved != null
      ? `${report.bagsOrItemsRemoved} ${report.bagsOrItemsRemoved === 1 ? 'bag/item' : 'bags/items'} removed`
      : null,
    report.durationMinutes != null ? `${report.durationMinutes} minutes volunteered` : null,
  ].filter(Boolean);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" aria-label="Litterbugs home">
            <img className={styles.logo} src="/brand/litterbugs-logo.png" alt="Litterbugs" />
          </Link>
          <Link className={styles.mapLink} href="/">Back to search</Link>
        </header>

        <article className={styles.story}>
          <section className={`${styles.hero} ${completed ? styles.heroCompleted : ''}`}>
            <p className={styles.shareLabel}>Shared Litterbugs report</p>
            <p className={styles.eyebrow}>{completed ? 'Cleanup complete' : 'Cleanup needed'}</p>
            <h1>{report.title}</h1>
            <p className={styles.heroDescription}>
              {completed
                ? 'A Litterbugs community member finished this cleanup. See the public impact summary below.'
                : 'A community member reported litter that is available for volunteer cleanup.'}
            </p>
            <div className={styles.heroMeta}>
              {completed && report.cleanerName ? <span>Cleaned by {report.cleanerName}</span> : null}
              {!completed && report.severity ? <span>{report.severity} priority</span> : null}
              {completed && report.completionDate ? <span>{formatDate(report.completionDate)}</span> : null}
              {!completed && report.reportDate ? <span>Reported {formatDate(report.reportDate)}</span> : null}
            </div>
          </section>

          {(report.beforePhotoUrl || report.afterPhotoUrl) ? (
            <div className={`${styles.photos} ${report.beforePhotoUrl && report.afterPhotoUrl ? '' : styles.singlePhoto}`}>
              {report.afterPhotoUrl ? (
                <div className={styles.photo}>
                  <img src={report.afterPhotoUrl} alt="Location after the cleanup" />
                  <span className={styles.photoLabel}>After</span>
                </div>
              ) : null}
              {report.beforePhotoUrl ? (
                <div className={styles.photo}>
                  <img src={report.beforePhotoUrl} alt={completed ? 'Location before the cleanup' : 'Reported litter'} />
                  <span className={styles.photoLabel}>{completed ? 'Before' : 'Report photo'}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className={styles.content}>
            <div className={styles.reportCopy}>
              {completed ? (
                <section className={styles.section}>
                  <p className={styles.sectionLabel}>Impact story</p>
                  <h2>Cleanup completed</h2>
                  <p>{report.cleanupDescription || 'A Litterbugs volunteer completed this cleanup.'}</p>
                </section>
              ) : (
                <section className={styles.section}>
                  <p className={styles.sectionLabel}>Report details</p>
                  <h2>What needs attention</h2>
                  <p>{report.notes || 'Open this report on the Litterbugs map to see the public details and help clean the area.'}</p>
                </section>
              )}

              <div className={styles.facts}>
                {impactFacts.map((fact) => (
                  <div className={styles.fact} key={fact}>
                    <strong>Cleanup impact</strong>
                    <span>{fact}</span>
                  </div>
                ))}
                {report.litterTypes.length ? (
                  <div className={styles.fact}>
                    <strong>{completed ? 'Original litter' : 'Reported litter'}</strong>
                    <span>{report.litterTypes.join(', ')}</span>
                  </div>
                ) : null}
                {report.reportDate ? (
                  <div className={styles.fact}>
                    <strong>Reported</strong>
                    <span>{formatDate(report.reportDate)}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <aside className={styles.actionCard}>
              <p className={styles.sectionLabel}>{completed ? 'Explore the report' : 'Help clean up'}</p>
              <h2>{completed ? 'See it on the map' : 'Ready to help?'}</h2>
              <p>
                {completed
                  ? 'View the report in context on the Litterbugs map.'
                  : 'View the report on the map for the location and current cleanup status.'}
              </p>
              <div className={styles.actions}>
                <Link className={styles.primaryAction} href={`/?report=${encodeURIComponent(report.id)}`}>View on map</Link>
                <OpenReportAction reportId={report.id} className={styles.secondaryAction} />
              </div>
              <small>{report.generalLocation}. Private profile details are not included on this shared page.</small>
            </aside>
          </div>
        </article>
      </div>
    </main>
  );
}
