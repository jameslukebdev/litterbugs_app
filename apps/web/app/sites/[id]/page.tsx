/* eslint-disable @next/next/no-img-element -- Existing public status artwork. */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FiChevronLeft,FiMapPin } from 'react-icons/fi';
import { loadReportSiteById } from '@/lib/report-site';
import { currentSiteReport,sitePath } from '@/lib/report-site-model';
import { siteSeo,siteStructuredData } from '@/lib/report-site-seo';
import { getSiteUrl } from '@/lib/env';
import { Website } from '@/components/public-website';
import { publicPageMetadata } from '@/lib/public-page-metadata';
import { publicReportStatus } from '@/lib/public-report-status';
import { publicReportPhotoDescription,reportDateLabel } from '@/lib/public-report-content';
import { ReportPhotos } from '@/app/reports/[id]/report-photos';
import { ReportFacts } from '@/app/reports/[id]/report-facts';
import { ReportSiteActivity } from '@/components/report-site-activity';
import { SiteShareAction } from '@/components/site-share-action';
import { BrandBug } from '@/components/brand-bug';
import { ContributionSupporters } from '@/components/contribution-supporters';
import { reportMapHref } from '@/lib/report-links';
import { SHARED_REPORT_AUTH_PARAM } from '@/lib/participation-auth';
import styles from '@/app/reports/[id]/report-share.module.css';
import localStyles from './site.module.css';

export const dynamic='force-dynamic';
type Props={params:Promise<{id:string}>};
export async function generateMetadata({params}:Props) {
  const site=await loadReportSiteById((await params).id);
  if(!site)return {title:'Site unavailable | Litterbugs',robots:{index:false,follow:false}};
  const seo=siteSeo(site,getSiteUrl());
  return publicPageMetadata({title:seo.title,description:seo.description,alternates:{canonical:seo.canonical},...(site.local?{robots:{index:false,follow:false}}:{})});
}
export default async function SitePage({params}:Props) {
  const {id}=await params;
  const site=await loadReportSiteById(id);
  if(!site)notFound();
  const report=currentSiteReport(site);
  if(!report)notFound();
  const title=site.reports[0].title;
  const status=publicReportStatus(report.state);
  const completed=report.state==='completed';
  const active=report.state==='available';
  const back=site.currentReportId?'/reports':'/cleanups';
  const backHref=back;
  const funds=(report.rewardCents??0)>0;
  const jsonLd=siteStructuredData(site,getSiteUrl());
  return <Website infoPage>
    <main id="main-content" tabIndex={-1} className={styles.page}><div className={styles.shell}>
      <nav className={styles.header} aria-label="Site navigation"><Link className={styles.back} href={backHref}><FiChevronLeft aria-hidden />{site.currentReportId?'Open reports':'Completed cleanups'}</Link></nav>
      <article className={styles.story}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,'\\u003c')}} />
        <div className={styles.top}>
          <ReportPhotos key={report.id} beforePhotoUrl={report.beforePhotoUrl} afterPhotoUrl={report.afterPhotoUrl} beforeCount={report.photoCount} afterCount={report.afterPhotoCount} beforeDescription={publicReportPhotoDescription(report,'before')} afterDescription={publicReportPhotoDescription(report,'after')} />
          <header className={styles.hero}>
            <div className={styles.headingTools}><p className={styles.status} data-tone={status.tone}>{status.bug && <img src={status.bug} alt="" aria-hidden width={20} height={20} />}{status.label}</p><SiteShareAction path={sitePath(site.id)} title={title} /></div>
            <h1>{title}</h1>
            <p className={styles.meta}><span>{report.generalLocation}</span>{completed&&report.completionDate?<span>Last cleaned {reportDateLabel(report.completionDate)}</span>:report.reportDate?<span>Reported {reportDateLabel(report.reportDate)}</span>:null}</p>
            <ReportFacts report={report} />
            {active && <p className={funds?styles.fund:styles.volunteer}>{funds?`$${(report.rewardCents!/100).toFixed(2)} in its cleanup fund`:'Volunteer cleanup'}</p>}
            <div className={styles.reporter}><span>Reported by</span>{report.reporterId?<Link href={`/members/${report.reporterId}`}>{report.reporterName||'Community member'}</Link>:<strong>{report.reporterName||'Community member'}</strong>}</div>
            {completed&&report.cleanerName&&<p className={localStyles.subtle}>Cleaned by {report.cleanerName}</p>}
            <div className={styles.nextSteps}>
              <ReportSiteActivity key={report.id} reportId={report.id} initialSite={site} mode="actions" />
              {active&&!report.localDevelopment&&<div className={styles.reportActions}>
                {report.fundingEligible&&<Link className="report-action-link button-link report-action-fund" prefetch={false} href={`/sign-in?${SHARED_REPORT_AUTH_PARAM}=1&next=${encodeURIComponent(reportMapHref(report.id,'fund'))}`}><BrandBug kind="bee" size={21} />Fund</Link>}
                <Link className="report-action-link button-link report-action-clean" prefetch={false} href={`/sign-in?${SHARED_REPORT_AUTH_PARAM}=1&next=${encodeURIComponent(reportMapHref(report.id,'clean'))}`}><BrandBug kind="butterfly" size={21} />Clean</Link>
              </div>}
              {report.state==='in_progress'&&<Link className="primary-button button-link" href={reportMapHref(report.id,'locate')}>View cleanup</Link>}
            </div>
          </header>
        </div>
        <div className={localStyles.body}>
          <section className={localStyles.latest}><h2>{completed?'Latest cleanup':'Latest report'}</h2><p>{completed?report.cleanupDescription:report.notes}</p>
            <Link className={localStyles.siteLink} href={new URL(report.canonicalUrl).pathname}>View {completed?'cleanup':'report'}</Link>
          </section>
          <ContributionSupporters reportId={report.id} initialCredit={report.contributorCredit} />
          <ReportSiteActivity key={`timeline-${report.id}`} reportId={report.id} initialSite={site} mode="timeline" />
          {report.location&&<a className={localStyles.siteLink} href={`https://www.google.com/maps/dir/?api=1&destination=${report.location.latitude},${report.location.longitude}`} target="_blank" rel="noopener noreferrer"><FiMapPin aria-hidden />Get directions</a>}
        </div>
      </article>
    </div></main>
  </Website>;
}
