import Link from 'next/link';

import { AdminAccess } from '@/app/admin/admin-access';
import { AdminInbox } from '@/app/admin/admin-inbox';
import { getAdminAccessState } from '@/lib/admin-access';

import styles from './admin.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const access = await getAdminAccessState();
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>LITTERBUGS OPERATIONS</span>
          <h1>Cleanup review inbox</h1>
        </div>
        <Link href="/">Return to map</Link>
      </header>
      {access === 'authorized'
        ? <AdminInbox />
        : <AdminAccess state={access} />}
    </main>
  );
}
