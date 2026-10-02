import { expect, it } from 'vitest';
import type { Report } from '@litterbugs/report-contract';
import { cleanupProgress, type ProgressAttempt } from './cleanup-progress';
const report = { user_id:'owner',created_at:'2026-09-01',expires_at:'2026-09-30',cleanup_state:'claimed' } as Report;
const attempt = {cleaner_id:'cleaner',claimed_at:'2026-09-29',claim_expires_at:'2026-10-02',first_submitted_at:null,latest_submitted_at:null,is_paid:true,payout_status:'pending'} as ProgressAttempt;
it('shows recorded milestones, the responsible person and active deadline beyond report expiry',()=>{
 const p=cleanupProgress(report,attempt,'cleaner');
 expect(p.events.map(e=>e.label)).toEqual(['Report created','Cleanup claimed']);
 expect(p.next).toContain('Your turn');expect(p.task).toBe('cleanup');expect(p.due).toBe(attempt.claim_expires_at);
 expect(p.payment).toContain('does not confirm a transfer');
 expect(cleanupProgress(report,attempt,'owner').task).toBeUndefined();
});
it('routes owner review and cleaner corrections without conflating completion with payout',()=>{
 expect(cleanupProgress({...report,cleanup_state:'completion_submitted'},attempt,'owner').task).toBe('review');
 expect(cleanupProgress({...report,cleanup_state:'changes_requested'},{...attempt,correction_due_at:'2026-10-03'},'cleaner').due).toBe('2026-10-03');
 const done=cleanupProgress({...report,cleanup_state:'completed'},{...attempt,completed_at:'2026-10-01'},'cleaner');
 expect(done.task).toBeUndefined();expect(done.payment).not.toContain('Reward sent');
});
it('does not offer task actions after explicit closure or invent submission dates',()=>{
 const p=cleanupProgress({...report,cancelled_at:'2026-10-01'},attempt,'cleaner');
 expect(p.task).toBeUndefined();expect(p.next).toContain('closed');expect(p.events.some(e=>e.label.includes('submitted'))).toBe(false);
});
