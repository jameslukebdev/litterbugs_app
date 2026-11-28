'use client';

import { reportDateLabel } from '@/lib/public-report-content';
import type { PublicReportShareModel } from '@/lib/public-report-share-model';
import { useContributionCredit } from '@/components/contribution-supporters';
import styles from './report-share.module.css';

const time = (value: string | null | undefined) => {
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? parsed : null;
};

/** The dated steps a report has been through, oldest first. */
export function reportTimeline(report: PublicReportShareModel) {
  const reporter = report.reporterName?.trim() && report.reporterName.trim() !== 'Community member' ? ` by ${report.reporterName.trim()}` : '';
  const donations = report.contributorCredit?.donations ?? [];
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const steps = [
    { at: report.reportDate, label: `Reported${reporter}` },
    ...donations.map(donation => ({
      at: donation.donatedAt,
      label: `${money.format(donation.amountCents / 100)} donated${donation.name ? ` by ${donation.name}` : ' anonymously'}`,
      donation: true,
    })),
    { at: donations.length ? null : report.fundedDate, label: 'First donation received' },
    { at: report.state === 'completed' ? report.claimedDate : null, label: 'Cleanup claimed' },
    { at: report.state === 'completed' ? report.completionDate : null,
      label: `Cleaned up${report.cleanerName?.trim() ? ` by ${report.cleanerName.trim()}` : ''}` },
    { at: report.state === 'expired' ? report.expiredDate : null, label: 'Report expired without a confirmed cleanup' },
  ];
  return steps.flatMap(step => {
    const date = 'donation' in step && step.donation && time(step.at) != null
      ? new Intl.DateTimeFormat('en-US', {
        month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
        timeZone: 'UTC', timeZoneName: 'short',
      }).format(new Date(step.at!)) : reportDateLabel(step.at ?? null);
    return date && step.at ? [{ at: step.at, date, label: step.label }] : [];
  }).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export function ReportTimeline({ report }: { report: PublicReportShareModel }) {
  const credit = useContributionCredit(report.id, report.contributorCredit);
  const steps = reportTimeline({ ...report, contributorCredit: credit });
  // A single "Reported" line says nothing the header has not.
  if (steps.length < 2) return null;
  return (
    <section className={styles.section} aria-labelledby="report-timeline-heading">
      <h2 id="report-timeline-heading">Timeline</h2>
      <ol className={styles.timeline}>
        {steps.map((step, index) => <li key={`${step.at}-${index}`}><time dateTime={step.at}>{step.date}</time><span>{step.label}</span></li>)}
      </ol>
    </section>
  );
}
