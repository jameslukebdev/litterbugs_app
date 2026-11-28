import type { ReportSite } from './report-site-model';
import { currentSiteReport,siteLastActivity,sitePath } from './report-site-model';

export function siteSeo(site: ReportSite,origin:string) {
  const current=currentSiteReport(site)!;
  const title=site.reports[0].title;
  const canonical=site.reports.length>1 ? new URL(sitePath(site.id),origin).toString() : current.canonicalUrl;
  const condition=current.state==='completed'?'Latest cleanup completed.':current.state==='expired'?'Latest report expired without a confirmed cleanup.':current.state==='in_progress'?'Cleanup in progress.':'Litter reported; needs a cleanup.';
  return {title:`${title} — site history | Litterbugs`,description:`${condition} ${site.completedCount} recorded ${site.completedCount===1?'cleanup':'cleanups'} at this location. See dated reports, cleanup results and photos.`,canonical,modified:siteLastActivity(site)};
}
export function siteStructuredData(site:ReportSite,origin:string) {
  const report=currentSiteReport(site)!;
  const seo=siteSeo(site,origin);
  const url=new URL(sitePath(site.id),origin).toString();
  return {'@context':'https://schema.org','@graph':[
    {'@type':'WebPage','@id':`${url}#webpage`,url,name:site.reports[0].title,description:seo.description,
      ...(seo.modified?{dateModified:seo.modified}:{}),about:{'@id':`${url}#place`}},
    {'@type':'Place','@id':`${url}#place`,name:site.reports[0].title,
      ...(report.location?{geo:{'@type':'GeoCoordinates',latitude:report.location.latitude,longitude:report.location.longitude}}:{})},
    {'@type':'ItemList',name:'Site reports and cleanups',numberOfItems:site.reports.length,itemListElement:site.reports.map((item,index)=>({'@type':'ListItem',position:index+1,url:item.canonicalUrl,name:item.title}))},
    {'@type':'BreadcrumbList',itemListElement:[{name:'Litterbugs',item:origin},{name:site.currentReportId?'Open reports':'Completed cleanups',item:new URL(site.currentReportId?'/reports':'/cleanups',origin).toString()},{name:site.reports[0].title,item:url}].map((item,index)=>({'@type':'ListItem',position:index+1,...item}))},
  ]};
}
