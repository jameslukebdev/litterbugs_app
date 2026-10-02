// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import type { Report } from '@litterbugs/report-contract';
import { afterEach, expect, it, vi } from 'vitest';
import { CleanupProgress } from './cleanup-progress';
vi.mock('@/lib/use-data-refresh',()=>({useDataRefresh:()=>0}));
vi.mock('@/lib/supabase/client',()=>({createClient:()=>{const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,maybeSingle:async()=>({data:null,error:null})};return{from:()=>q};}}));
afterEach(cleanup);
const report={id:'report',user_id:'owner',created_at:'2026-09-10T00:00:33Z',cancelled_at:'2026-09-10T00:12:07Z',cleanup_state:'available'} as Report;
it('keeps server and initial client markup independent of browser timezone, then shows local dates',async()=>{
 const props={report,userId:'owner',taskBase:'/account/reports/report?from=reports'};
 const html=renderToString(<CleanupProgress {...props}/>);
 expect(html).toContain('Loading cleanup dates');expect(html).not.toContain('<time');
 render(<CleanupProgress {...props}/>);
 expect(await screen.findByText('Report cancelled')).toBeTruthy();
 expect(screen.getByText('Dates and deadlines use your local time.')).toBeTruthy();
});
