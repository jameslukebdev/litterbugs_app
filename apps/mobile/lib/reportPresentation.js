import { cleanupStatusPresentation } from './cleanupEligibility';
const formatUsd = cents => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);
export function reportPresentation(report) {
  const lifecycle = cleanupStatusPresentation(report);
  const completed = report?.cleanup_state === 'completed';
  const held = report?.cleanup_issue_hold && !report.cancelled_at && !report.expired_at && !completed;
  const amount = Number(report?.funded_amount_cents) || 0;
  return {
    status: held ? 'Update requested' : lifecycle?.title || (report?.cancelled_at ? 'Report closed' : report?.expired_at ? 'Report expired' : 'Available for cleanup'),
    icon: held ? 'flag-outline' : lifecycle?.icon || 'ellipse-outline',
    funding: amount < 1 ? 'Volunteer' : completed ? 'Cleanup approved' : `Cleanup reward ${formatUsd(amount)}`,
  };
}
