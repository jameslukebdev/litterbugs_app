import Link from 'next/link';

import { AdminAccess } from '@/app/admin/admin-access';
import { getAdminAccessState } from '@/lib/admin-access';
import { loadDashboard } from '@/lib/admin-analytics/load';
import { parsePeriod } from '@/lib/admin-analytics/model';
import { AnalyticsDashboard } from './dashboard';
import adminStyles from '../admin.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Owner analytics | Litterbugs', robots: { index: false, follow: false } };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string; view?: string }> }) {
  const access = await getAdminAccessState();
  if (access !== 'authorized') return <main className={adminStyles.shell}>
    <header className={adminStyles.header}><h1>Owner analytics</h1><Link href="/admin">Review inbox</Link></header>
    <AdminAccess state={access} destination="analytics" />
  </main>;
  const params = await searchParams;
  const period = parsePeriod(params.days);
  const view = params.view === 'app' || params.view === 'website' ? params.view : 'overview';
  return <AnalyticsDashboard dashboard={await loadDashboard(period)} view={view} />;
}
