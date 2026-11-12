import { Website } from './public-website';
import { LoadingFirefly } from './loading-firefly';
import styles from './route-loading.module.css';

/** No data reads: navigation can acknowledge a click before the destination is ready. */
export function RouteLoading() {
  return <Website infoPage><main id="main-content" className={styles.shell} aria-busy="true">
    <div className={styles.content}>
      <span className="account-skeleton account-skeleton-name" aria-hidden="true" />
      <span className="account-skeleton account-skeleton-line" aria-hidden="true" />
      <div className={styles.indicator}><LoadingFirefly active label="Please wait" /></div>
      <p role="status" className="sr-only">Please wait</p>
    </div>
  </main></Website>;
}
