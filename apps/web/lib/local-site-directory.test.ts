import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {groupLocalDirectory,type DirectoryEntry} from './local-site-directory';
const rows:DirectoryEntry[]=[
 {id:'original',siteId:'location',createdAt:'2026-11-01',completedAt:'2026-11-20',state:'completed'},
 {id:'second',siteId:'location',createdAt:'2026-11-21',completedAt:'2026-11-22',state:'completed'},
 {id:'current',siteId:'location',createdAt:'2026-11-24',completedAt:null,state:'available'},
 {id:'other',siteId:'other-location',createdAt:'2026-11-23',completedAt:'2026-11-23',state:'completed'},
];
it('presents one card per identity before pagination and retains a successful cleanup when litter recurs',()=>{
 const completed=groupLocalDirectory(rows,'completed');
 expect(completed).toHaveLength(2);
 expect(completed.map(row=>row.siteId)).toEqual(['other-location','location']);
 expect(completed[1]).toMatchObject({reportId:'second',reportCount:3,completedCount:2,hasActiveReport:true});
 expect(groupLocalDirectory(rows,'open')).toEqual([expect.objectContaining({siteId:'location',reportId:'current',completedCount:2})]);
 expect(groupLocalDirectory([...rows,{...rows[2],state:'expired' as const}].filter(row=>row.id!=='current'||row.state==='expired'),'open')).toEqual([]);
});
