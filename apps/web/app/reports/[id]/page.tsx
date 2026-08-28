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
          <Link className={styles.mapLink} href="/">Explore the map</Link>
        </header>

        <article className={styles.story}>
          <section className={`${styles.hero} ${completed ? styles.heroCompleted : ''}`}>
            <p className={styles.eyebrow}>
              {completed ? '✓ Cleanup Complete' : 'Volunteer Cleanup Needed'}
            </p>
            <h1>{report.title}</h1>
            <div className={styles.heroMeta}>
              <span>{report.generalLocation}</span>
              {completed && report.cleanerName ? <span>Cleaned by {report.cleanerName}</span> : null}
              {!completed && report.severity ? <span>{report.severity} severity</span> : null}
              {completed && report.completionDate ? <span>{formatDate(report.completionDate)}</span> : null}
            </div>
          </section>

          {(report.beforePhotoUrl || report.afterPhotoUrl) ? (
            <div className={styles.photos}>
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
            {completed ? (
              <section className={styles.section}>
                <h2>Community impact</h2>
                <p>{report.cleanupDescription || 'A Litterbugs volunteer completed this cleanup.'}</p>
              </section>
            ) : (
              <section className={styles.section}>
                <h2>This location needs help</h2>
                <p>{report.notes || 'Open this report in Litterbugs to see the details and help clean the area.'}</p>
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
                  <strong>Original litter</strong>
                  <span>{report.litterTypes.join(', ')}</span>
                </div>
              ) : null}
              {report.reportDate ? (
                <div className={styles.fact}>
                  <strong>Originally reported</strong>
                  <span>{formatDate(report.reportDate)}</span>
                </div>
              ) : null}
            </div>

            <div className={styles.actions}>
              <OpenReportAction reportId={report.id} className={styles.primaryAction} />
              <Link className={styles.secondaryAction} href="/">Browse the map</Link>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
