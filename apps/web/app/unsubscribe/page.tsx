import { UnsubscribeForm } from './unsubscribe-form';
import styles from '@/components/email-preferences.module.css';

export const metadata = { title: 'Unsubscribe | Litterbugs', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export default function Page() {
  return <main className={styles.publicPage}><UnsubscribeForm /></main>;
}
