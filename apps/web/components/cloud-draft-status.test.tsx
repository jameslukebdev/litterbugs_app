// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CloudDraftStatus } from './cloud-draft-status';
const state=vi.hoisted(()=>({save:vi.fn(),status:'synced',listener:undefined as undefined|((owner:string,key:string,next:string)=>void)}));
vi.mock('@/lib/cloud-drafts',()=>({cloudDrafts:{status:()=>state.status,confirmation:()=>({confirmedAt:'2026-10-01T12:00:00Z',expiresAt:'2026-10-04T12:00:00Z'}),save:state.save,subscribe:(listener:typeof state.listener)=>{state.listener=listener;return()=>{};}}}));
vi.mock('./draft-comparison',()=>({DraftComparison:()=>null}));
afterEach(()=>{cleanup();state.status='synced';vi.clearAllMocks();});
it('shows the actual account expiry and reconfirms before a device handoff',async()=>{
 render(<CloudDraftStatus userId="owner" draftKey="report" />);
 expect(await screen.findByText(/Account copy expires/)).toBeTruthy();
 expect(screen.queryByText(/within 30 days/)).toBeNull();
 fireEvent.click(screen.getByText('Continue on your phone'));
 fireEvent.click(screen.getByRole('button',{name:'Confirm before switching devices'}));
 expect(state.save).toHaveBeenCalledWith('owner','report');
 await act(async()=>{state.status='offline';state.listener?.('owner','report','offline');});
 expect(screen.queryByText(/Account copy expires/)).toBeNull();
 expect(screen.getByRole('button',{name:'Sync now'})).toBeTruthy();
});
