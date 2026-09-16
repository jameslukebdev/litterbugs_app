import { cleanupStatusPresentation } from './cleanupEligibility';
const formatUsd = cents => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);
export function reportPresentation(report) {
  const lifecycle = cleanupStatusPresentation(report);
  const completed = report?.cleanup_state === 'completed';
  const amount = Number(report?.funded_amount_cents) || 0;
  return {
    status: lifecycle?.title || (report?.cancelled_at ? 'Report closed' : report?.expired_at ? 'Report expired' : 'Available for cleanup'),
    icon: lifecycle?.icon || 'ellipse-outline',
    funding: amount < 1 ? 'Volunteer' : completed ? 'Cleanup approved' : `Cleanup reward ${formatUsd(amount)}`,
  };
}
