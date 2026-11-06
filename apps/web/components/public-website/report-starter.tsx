'use client';
import Link from 'next/link';
import Image from 'next/image';
import { BrandBug } from '@/components/brand-bug';
import { HOME_MAP_HREF, REPORT_ENTRY_HREF } from '@/lib/home-map-link';
import styles from './report-starter.module.css';

export function ReportStarter() {
  return <section className={styles.starter} aria-labelledby="report-starter-title">
    <h2 id="report-starter-title">Explore what you can do with Litterbugs</h2>
    <div className={styles.choices}>
      <article className={styles.choice} aria-labelledby="report-choice-title">
        <Image className={styles.photo} src="/homepage-photos/action-report.webp" alt="A person taking a photograph with a phone outdoors" width={900} height={600} sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1244px) 30vw, 375px" loading="lazy" />
        <h3 id="report-choice-title">Report litter</h3>
        <p>See trash? Pin the spot, add photos, and earn money when it’s cleaned up.</p>
        {/* Same flow as the map's Report Litter button: sign in if needed, pin the spot, then add photos. */}
        <div className={styles.action}><Link className={styles.cta} href={REPORT_ENTRY_HREF}><BrandBug kind="ladybug" size={23} className="brand-action-icon" />Report trash</Link></div>
      </article>
      <article className={styles.choice} aria-labelledby="fund-choice-title">
        <Image className={styles.photo} src="/homepage-photos/action-fund.webp" alt="A person holding a payment card while using a laptop" width={900} height={600} sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1244px) 30vw, 375px" loading="lazy" />
        <h3 id="fund-choice-title">Fund a cleanup</h3>
        <p>Pick a spot and help pay someone to clean it up.</p>
        <div className={styles.action}><Link className={styles.cta} href={HOME_MAP_HREF}><BrandBug kind="bee" size={23} className={`brand-action-icon ${styles.fundIcon}`} />Choose a spot</Link></div>
      </article>
      <article className={styles.choice} aria-labelledby="clean-choice-title">
        <Image className={styles.photo} src="/homepage-photos/action-clean.webp" alt="A volunteer picking up litter outdoors" width={900} height={600} sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1244px) 30vw, 375px" loading="lazy" />
        <h3 id="clean-choice-title">Earn money cleaning up</h3>
        <p>Find a spot that needs cleaning and see how much you could earn.</p>
        <div className={styles.action}><Link className={styles.cta} href={HOME_MAP_HREF}><BrandBug kind="butterfly" size={23} className={`brand-action-icon ${styles.cleanIcon}`} />Find a cleanup</Link></div>
      </article>
    </div>
  </section>;
}
