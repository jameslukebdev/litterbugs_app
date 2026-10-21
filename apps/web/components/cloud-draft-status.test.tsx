// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CloudDraftStatus } from './cloud-draft-status';
const state=vi.hoisted(()=>({save:vi.fn(),resolve:vi.fn(),status:'synced',listener:undefined as undefined|((owner:string,key:string,next:string)=>void)}));
vi.mock('@/lib/cloud-drafts',()=>({cloudDrafts:{status:()=>state.status,save:state.save,resolve:state.resolve,subscribe:(listener:typeof state.listener)=>{state.listener=listener;return()=>{};}}}));
vi.mock('./draft-comparison',()=>({DraftComparison:()=> <div>Choose a draft version</div>}));
afterEach(()=>{cleanup();state.status='synced';vi.clearAllMocks();});
it('keeps routine autosaving invisible without moving the form',async()=>{
 const {container}=render(<CloudDraftStatus userId="owner" draftKey="report" />);
 for (const status of ['unsaved','local','syncing','synced','local','synced']) {
  await act(async()=>{state.status=status;state.listener?.('owner','report',status);});
  expect(container.childElementCount).toBe(0);
 }
});
it('keeps failed sync actionable and hides it after recovery',async()=>{
 state.status='offline';render(<CloudDraftStatus userId="owner" draftKey="report" />);
 fireEvent.click(screen.getByRole('button',{name:'Sync now'}));
 expect(state.save).toHaveBeenCalledWith('owner','report');
 await act(async()=>{state.status='synced';state.listener?.('owner','report','synced');});
 expect(screen.queryByRole('region',{name:'Draft sync'})).toBeNull();
});
it('retains conflict and interrupted submission recovery',async()=>{
 state.status='conflict';render(<CloudDraftStatus userId="owner" draftKey="report" />);
 expect(screen.getByText('Choose a draft version')).toBeTruthy();
 await act(async()=>{state.status='submitting';state.listener?.('owner','report','submitting');});
 fireEvent.click(screen.getByRole('button',{name:'Restore submitted draft'}));
 expect(state.resolve).toHaveBeenCalledWith('owner','report','account');
});
