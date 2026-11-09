/* eslint-disable @next/next/no-img-element -- the flower labels the cleaned-up family, like the map. */
import Link from 'next/link';
import { BrandBug } from '@/components/brand-bug';
import type { PublicReportShareModel } from '@/lib/public-report-share-model';
import { PublicPhoto } from './public-photo';
import styles from './home-cleanup-proof.module.css';

export function HomeCleanupProof({ report, heading = 'Most recent cleanup', showHeading = true }: { report: PublicReportShareModel; heading?: string; showHeading?: boolean }) {
  const cleaned = report.completionDate ? new Date(report.completionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : null;
  // Where, when and who in one line. Community pages list these as facts underneath instead (showHeading false).
  const meta = showHeading ? [report.localityLabel, cleaned && `Cleaned ${cleaned}`, report.cleanerName && `by ${report.cleanerName}`].filter(Boolean).join(' · ') : report.localityLabel;
  return (
    <section className={styles.proof} aria-labelledby={showHeading ? "home-cleanup-title" : undefined} aria-label={showHeading ? undefined : report.title} data-cleanup-proof="true">
      {showHeading && <div className={styles.heading}>
        <h2 id="home-cleanup-title" className="heading-with-bug"><img className="heading-bug" src="/brand/bugs/flower.png" alt="" aria-hidden="true" width={32} height={32} />{heading}</h2>
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
          {meta && <p>{meta}</p>}
        </div>
        <Link className={styles.cta} href={`/reports/${report.id}`}><BrandBug kind="flower" size={22} className="brand-action-icon" />See this cleanup</Link>
      </div>
    </section>
  );
}
