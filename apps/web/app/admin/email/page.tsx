import Link from 'next/link';
import { AdminAccess } from '@/app/admin/admin-access';
import { getAdminAccessState } from '@/lib/admin-access';
import { WeeklyEmailList } from './weekly-email-list';
import styles from '../admin.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Email list | Litterbugs', robots: { index: false, follow: false } };
export default async function Page() {
  const access = await getAdminAccessState();
  return <main className={styles.shell}>
    <header className={styles.header}><h1>Email list</h1><nav><Link href="/admin">Review inbox</Link></nav></header>
    {access === 'authorized' ? <WeeklyEmailList /> : <AdminAccess state={access} destination="email" />}
  </main>;
}
