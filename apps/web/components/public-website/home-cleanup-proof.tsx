import Link from 'next/link';
import type { PublicReportShareModel } from '@/lib/public-report-share-model';
import { PublicPhoto } from './public-photo';
import styles from './home-cleanup-proof.module.css';

export function HomeCleanupProof({ report, heading = 'Most recent cleanup', showHeading = true }: { report: PublicReportShareModel; heading?: string; showHeading?: boolean }) {
  return (
    <section className={styles.proof} aria-labelledby={showHeading ? "home-cleanup-title" : undefined} aria-label={showHeading ? undefined : report.title} data-cleanup-proof="true">
      {showHeading && <div className={styles.heading}>
        <h2 id="home-cleanup-title">{heading}</h2>
        <Link href="/cleanups">See completed cleanups</Link>
      </div>}
      <div className={styles.photos}>
        {[
          ['Before', report.beforePhotoUrl],
          ['After', report.afterPhotoUrl],
        ].map(([label, src]) => src && (
          <figure key={label}>
            <PublicPhoto src={src} alt={`${label} cleanup: ${report.title}`} width={900} height={675} />
            <figcaption>{label}</figcaption>
          </figure>
        ))}
      </div>
      <div className={styles.details}>
        <div>
          <h3>{report.title}</h3>
          {report.localityLabel && <p>{report.localityLabel}</p>}
        </div>
        <Link className={styles.cta} href={`/reports/${report.id}`}>See this cleanup</Link>
      </div>
    </section>
  );
}
