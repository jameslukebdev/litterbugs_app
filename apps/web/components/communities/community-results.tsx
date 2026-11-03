import Link from 'next/link';
import { HomeCleanupProof } from '@/components/public-website/home-cleanup-proof';
import { PublicPhoto } from '@/components/public-website/public-photo';
import { cleanupCompletionDate, cleanupOutcome } from '@/lib/community-evidence';
import type { PublicReportShareModel } from '@/lib/public-report-share-model';
import styles from './community-results.module.css';

function ResultFacts({ report }: { report: PublicReportShareModel }) {
  const date = cleanupCompletionDate(report.completionDate);
  const outcome = cleanupOutcome(report);
  return <dl className={styles.facts}>
    <div><dt>Completed</dt><dd>{date ? <time dateTime={report.completionDate!}>{date}</time> : 'Date not recorded'}</dd></div>
    {report.cleanerName && <div><dt>Cleaned by</dt><dd>{report.cleanerName}</dd></div>}
    {report.reporterName && <div><dt>Reported by</dt><dd>{report.reporterName}</dd></div>}
    {outcome && <div><dt>Recorded outcome</dt><dd>{outcome}</dd></div>}
  </dl>;
}

/** Existing approved report URLs remain the evidence source; no duplicate stories. */
export function CommunityResults({ reports, featured = true }: { reports: PublicReportShareModel[]; featured?: boolean }) {
  const completed = reports.filter(report => report.state === 'completed');
  const proof = featured ? completed.find(report => report.beforePhotoUrl && report.afterPhotoUrl) : undefined;
  const rest = completed.filter(report => report.id !== proof?.id);
  return <>
    {proof && <div className={styles.feature}>
      <HomeCleanupProof report={proof} showHeading={false} />
      <ResultFacts report={proof} />
      {proof.cleanupDescription && <p className={styles.note}>{proof.cleanupDescription}</p>}
    </div>}
    {rest.length > 0 && <div className={styles.grid}>{rest.map(report => {
      const photo = report.afterPhotoUrl || report.beforePhotoUrl;
      return <article key={report.id} className={styles.card}>
        {photo && <Link prefetch={false} href={`/reports/${report.id}`} aria-label={`See ${report.title}`}><PublicPhoto src={photo} alt={`${report.afterPhotoUrl ? 'After' : 'Before'} cleanup: ${report.title}`} width={600} height={400} /></Link>}
        <div className={styles.copy}><h3><Link prefetch={false} href={`/reports/${report.id}`}>{report.title}</Link></h3><ResultFacts report={report} />{report.cleanupDescription && <p>{report.cleanupDescription}</p>}</div>
      </article>;
    })}</div>}
    {completed.length > 0 && <p className={styles.note}>Cleanup quantities are reported by the cleaner.</p>}
  </>;
}
