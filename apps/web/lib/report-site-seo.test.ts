import {expect,it} from 'vitest';
import {reportSite} from './report-site-model';
import {siteSeo,siteStructuredData} from './report-site-seo';
import type {PublicReportShareModel} from './public-report-share-model';
const original={id:'old',title:'Creek litter',state:'completed',reportDate:'2026-11-01',completionDate:'2026-11-10',canonicalUrl:'https://litterbugs.app/litter-reports/creek-old',location:{latitude:36.2,longitude:-81.6}} as PublicReportShareModel;
it('keeps singleton report canonical and adds a distinct recurring overview without replacing original URLs',()=>{
 const singleton=reportSite([original],false,'location');
 expect(siteSeo(singleton,'https://litterbugs.app').canonical).toBe(original.canonicalUrl);
 const next={...original,id:'new',state:'available' as const,reportDate:'2026-11-24',completionDate:null,canonicalUrl:'https://litterbugs.app/litter-reports/creek-new'};
 const site=reportSite([next,original],false,'location');
 expect(siteSeo(site,'https://litterbugs.app')).toMatchObject({canonical:'https://litterbugs.app/sites/location',modified:'2026-11-24'});
 expect(JSON.stringify(siteStructuredData(site,'https://litterbugs.app'))).toContain(original.canonicalUrl);
 expect(original.canonicalUrl).toBe('https://litterbugs.app/litter-reports/creek-old');
});
