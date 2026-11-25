import type { Database } from '@litterbugs/report-contract';
import type { SupabaseClient } from '@supabase/supabase-js';

export const cleanupIssuesEnabled = process.env.NEXT_PUBLIC_CLEANUP_ISSUES_ENABLED === 'true';
export const issueReasons = [
  ['access', 'Can’t reach the litter'], ['information', 'Need more information'],
  ['unsafe', 'Unsafe to clean'], ['moved', 'Litter has moved'],
  ['missing', 'No litter here'], ['other', 'Something else'],
] as const;
export type IssueReason = typeof issueReasons[number][0];
export type CleanupIssue = {
  id: string; report_id: string; cleanup_attempt_id: string; reporter_id: string|null; cleaner_id: string|null;
  reason: IssueReason; status: 'awaiting_reporter' | 'awaiting_cleaner' | 'team_review' | 'resolved';
  requires_team_review: boolean; keeps_claim: boolean; version: number;
  created_at: string; updated_at: string; resolved_at: string | null; resolved_by: string | null;
};
export type IssueMessage = { id: string; issue_id: string; author_id: string|null; body: string; photo_paths: string[]; created_at: string };
export type ReportContentRevision = {
 id: string; report_id: string; revision: number; author_id: string | null; notes_other: string | null;
 additional_information: string | null; photo_paths: string[]; title: string | null; litter_types: string[] | null;
 severity: string | null; latitude: number | null; longitude: number | null; created_at: string;
};
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
type Fn<Args, Returns> = { Args: Args; Returns: Returns };
export type IssueDatabase = Omit<Database,'public'> & { public: Omit<Database['public'],'Tables'|'Functions'> & {
 Tables: Database['public']['Tables'] & { cleanup_issues: Table<CleanupIssue>; cleanup_issue_messages: Table<IssueMessage>; report_content_revisions: Table<ReportContentRevision> };
 Functions: Database['public']['Functions'] & {
  open_cleanup_issue: Fn<{ target_cleanup_id:string; request_id:string; issue_reason:IssueReason; message_body:string; keeps_claim:boolean; message_photos?:string[] },CleanupIssue>;
  reply_cleanup_issue: Fn<{ target_issue_id:string; message_id:string; expected_version:number; message_body:string; message_photos?:string[] },CleanupIssue>;
  resolve_cleanup_issue: Fn<{ target_issue_id:string; expected_version:number },CleanupIssue>;
  review_cleanup_issue: Fn<{ target_issue_id:string; expected_version:number },CleanupIssue>;
  update_report_content: Fn<{ target_report_id:string; expected_revision:number; update_id:string; new_description:string; new_information:string; new_photo_paths:string[] },Database['public']['Tables']['reports']['Row']>;
 };
}};
// This website-only additive schema is prepared locally, not yet applied to hosted.
export const issueClient = (client: SupabaseClient<Database>) => client as unknown as SupabaseClient<IssueDatabase>;
export const issueHref = (id:string) => `/account/cleanup-issues/${encodeURIComponent(id)}`;
export function issueStatus(issue:CleanupIssue, userId:string) {
 if (issue.status==='resolved') return issue.keeps_claim ? 'Cleanup resumed' : 'Issue resolved';
 if (issue.requires_team_review || issue.status==='team_review') return 'Litterbugs review';
 if (issue.status==='awaiting_cleaner') return userId===issue.cleaner_id ? 'Response ready' : 'Awaiting cleaner';
 return userId===issue.reporter_id ? 'Reply needed' : 'Awaiting reply';
}
export function issueError(error:unknown) {
 const message=error && typeof error==='object' && 'message' in error ? String(error.message) : '';
 if (/photo|image/i.test(message)) return 'The photo could not be saved. Your message is still here. Try again.';
 if (/issue_changed_refresh|report_changed_refresh/.test(message)) return 'There’s a newer update. Refresh and review it before trying again.';
 if (/not_allowed|not_found|permission|42501/.test(message)) return 'This action isn’t available for your account.';
 if (/not_ready_to_resume|cleanup_paused_for_issue|report_paused_for_issue/.test(message)) return 'This cleanup is paused until the issue is resolved.';
 if (/unavailable|claim_changed/.test(message)) return 'This cleanup has changed. Refresh to see its current status.';
 return 'We couldn’t confirm the change. Your message is still here. Try again.';
}
export function remainingClaimTime(attempt:{claim_expires_at:string;issue_paused_at?:string|null}, now=Date.now()) {
 return Math.max(0,Date.parse(attempt.claim_expires_at)-(attempt.issue_paused_at?Date.parse(attempt.issue_paused_at):now));
}
