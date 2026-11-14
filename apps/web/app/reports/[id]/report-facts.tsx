import { reportDateLabel } from '@/lib/public-report-content';
import type { PublicReportShareModel } from '@/lib/public-report-share-model';
import styles from './report-share.module.css';

const DAY_MS = 86_400_000;
const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const time = (value: string | null | undefined) => {
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? parsed : null;
};

/** "0.4 mi away", or feet when it is right next door. */
export function distanceLabel(miles: number) {
  if (miles < 0.1) return `${Math.max(50, Math.round(miles * 5280 / 50) * 50)} ft away`;
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi away`;
}

/** "45 min", "1 hr", "2.5 hrs". */
export function hoursLabel(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.round(minutes / 6) / 10;
  return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
}

/** Whole days between two moments, or null when either is missing or they are out of order. */
function daysBetween(from: string | null | undefined, to: string | null | undefined | number) {
  const start = time(from);
  const end = typeof to === 'number' ? to : time(to);
  return start == null || end == null || end < start ? null : Math.floor((end - start) / DAY_MS);
}

/** The headline numbers for a report, built only from what is recorded. */
export function reportFacts(report: PublicReportShareModel, now = Date.now()) {
  const facts: { value: string; label: string }[] = [];
  const photos = (report.beforePhotoUrl ? Math.max(1, report.photoCount ?? 1) : 0)
    + (report.afterPhotoUrl ? Math.max(1, report.afterPhotoCount ?? 1) : 0);
  if (report.state === 'completed') {
    if (report.weightPounds != null && report.weightPounds > 0) facts.push({ value: `${report.weightPounds} lb`, label: 'removed' });
    if (report.bagsOrItemsRemoved != null && report.bagsOrItemsRemoved > 0) {
      facts.push({ value: String(report.bagsOrItemsRemoved), label: report.bagsOrItemsRemoved === 1 ? 'bag/item' : 'bags/items' });
    }
    // Time the cleaner spent on site, as they reported it.
    if (report.cleanupMinutes != null && report.cleanupMinutes > 0) facts.push({ value: hoursLabel(report.cleanupMinutes), label: 'cleanup time' });
    const days = daysBetween(report.reportDate, report.completionDate);
    if (days != null) facts.push({ value: days === 0 ? '< 1 day' : plural(days, 'day'), label: 'report to cleanup' });
  } else {
    // Priority and the cleanup fund are already stated in the header lines around this row.
    const days = report.state === 'expired' ? daysBetween(report.reportDate, report.expiredDate) : daysBetween(report.reportDate, now);
    if (days != null) facts.push({ value: days === 0 ? '< 1 day' : plural(days, 'day'), label: 'open' });
  }
  // A finished cleanup is summed up by what was removed and how long it took; the litter and photos are on the page itself.
  if (report.state === 'completed') return facts;
  const types = report.litterTypes.map(value => value.trim()).filter(Boolean).length;
  if (types > 0) facts.push({ value: String(types), label: types === 1 ? 'litter type' : 'litter types' });
  if (photos > 0) facts.push({ value: String(photos), label: photos === 1 ? 'photo' : 'photos' });
  return facts;
}

/** A row of the report's key numbers under its title. */
export function ReportFacts({ report }: { report: PublicReportShareModel }) {
  const facts = reportFacts(report);
  if (!facts.length) return null;
  return (
    <dl className={styles.stats}>
      {facts.map(fact => <div key={fact.label}><dd>{fact.value}</dd><dt>{fact.label}</dt></div>)}
    </dl>
  );
}

/** The dated steps a report has been through, oldest first. */
export function reportTimeline(report: PublicReportShareModel) {
  const reporter = report.reporterName?.trim() && report.reporterName.trim() !== 'Community member' ? ` by ${report.reporterName.trim()}` : '';
  const steps = [
    { at: report.reportDate, label: `Reported${reporter}` },
    { at: report.fundedDate, label: 'First contribution to its cleanup fund' },
    { at: report.state === 'completed' ? report.claimedDate : null, label: 'Cleanup claimed' },
    { at: report.state === 'completed' ? report.completionDate : null,
      label: `Cleaned up${report.cleanerName?.trim() ? ` by ${report.cleanerName.trim()}` : ''}` },
    { at: report.state === 'expired' ? report.expiredDate : null, label: 'Report expired without a confirmed cleanup' },
  ];
  return steps.flatMap(step => {
    const date = reportDateLabel(step.at ?? null);
    return date && step.at ? [{ at: step.at, date, label: step.label }] : [];
  }).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export function ReportTimeline({ report }: { report: PublicReportShareModel }) {
  const steps = reportTimeline(report);
  // A single "Reported" line says nothing the header has not.
  if (steps.length < 2) return null;
  return (
    <section className={styles.section} aria-labelledby="report-timeline-heading">
      <h2 id="report-timeline-heading">Timeline</h2>
      <ol className={styles.timeline}>
        {steps.map(step => <li key={step.label}><time dateTime={step.at}>{step.date}</time><span>{step.label}</span></li>)}
      </ol>
    </section>
  );
}
