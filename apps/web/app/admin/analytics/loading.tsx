import Link from 'next/link';
import styles from './dashboard.module.css';

export default function AnalyticsLoading() {
  return <div className={styles.canvas}><main className={styles.shell} aria-busy="true" aria-label="Analytics">
    <header className={styles.header}><Link className={styles.brand} href="/admin">Litterbugs</Link><Link href="/admin">Review inbox</Link></header>
    <div className={styles.intro}><h1>Analytics</h1></div>
    <div className={styles.skeleton} aria-hidden="true"><div /><div /><div /><div /><div /><div /></div>
  </main></div>;
}
