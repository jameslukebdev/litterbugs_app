import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { IoChevronForward } from 'react-icons/io5';
import { AccountNavigation } from '@/components/account-navigation';
import { createClient } from '@/lib/supabase/server';
import { loadNearbyAlertReports } from '@/lib/nearby-alert-reports';
import { nearbyAlertHref, notificationInboxHref, notificationView } from '@/lib/notification-view';
import { realUserIdFromClaims } from '@/lib/report-access';

export const metadata = { title: 'New litter near you | Litterbugs', robots: { index: false, follow: false } };
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const selectedReportHref = (id: string) => `/map?view=map&browse=1&report=${encodeURIComponent(id)}`;

export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const view = notificationView(query);
  const client = await createClient();
  const { data: auth } = await client.auth.getClaims();
  const userId = realUserIdFromClaims(auth?.claims);
  if (!userId) redirect(`/sign-in?next=${encodeURIComponent(nearbyAlertHref(id, view))}`);

  const { data: alert, error } = await client.from('cleanup_notifications').select('*')
    .eq('id', id).eq('user_id', userId).eq('event_type', 'nearby_reports_daily').maybeSingle();
  if (error) throw new Error('This notification could not be loaded. Please try again.');
  if (!alert) notFound();

  const { reports, exact, sameArea, hasArea } = await loadNearbyAlertReports(client, userId, alert);
  if (reports.length === 1 && (exact || sameArea)) redirect(selectedReportHref(reports[0].id));

  return <main className="account-page-layout account-v2">
    <AccountNavigation destination="notifications" />
    <section className="notification-inbox embedded-panel account-dialog member-dashboard">
      <Link className="secondary-button account-back-link" href={notificationInboxHref(view, id)}>Back to notifications</Link>
      <header className="account-screen-title"><h1>New litter near you</h1></header>
      {!exact && hasArea && <p>This older alert didn’t save its report links. These are the reports posted near your saved area in the 24 hours before the alert.</p>}
      {!reports.length && <p>{exact ? 'The reports from this alert are no longer available.' : 'We couldn’t find any reports for this alert.'}</p>}
      {!!reports.length && <ul className="notification-list" aria-label="Reports from this alert">
        {reports.map(report => <li key={report.id}>
          <Link className="notification-row-link" href={selectedReportHref(report.id)}><strong>{report.title?.trim() || 'Litter report'}</strong></Link>
          <IoChevronForward className="notification-chevron" aria-hidden />
        </li>)}
      </ul>}
    </section>
  </main>;
}
